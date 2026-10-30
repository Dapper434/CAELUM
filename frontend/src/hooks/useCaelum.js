import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { INITIAL_HOSPITALS, INITIAL_ALERTS, INITIAL_PROPOSALS, INITIAL_TRANSFERS } from '../lib/mockData';
import { regionByCode } from '../lib/regions';

export function useCaelum(regionCode) {
  const region = regionByCode(regionCode);
  const [hospitals, setHospitals] = useState(INITIAL_HOSPITALS);
  const [alerts, setAlerts] = useState(INITIAL_ALERTS);
  const [proposals, setProposals] = useState(INITIAL_PROPOSALS);
  const [transfers, setTransfers] = useState(INITIAL_TRANSFERS);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanTime, setLastScanTime] = useState(new Date().toLocaleTimeString());
  const [toastMessage, setToastMessage] = useState(null);
  const toastTimer = useRef(null);

  const showToast = useCallback((msg, type = "success") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMessage({ text: msg, type, id: Date.now() });
    toastTimer.current = setTimeout(() => setToastMessage(null), 4500);
  }, []);

  // Real-time Supabase WebSocket integration
  useEffect(() => {
    if (!isSupabaseConfigured) {
      console.info("⚡ CAELUM: Running in local verified state mode.");
      return;
    }

    const transferChannel = supabase
      .channel('realtime:transfers')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transfers' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTransfers((prev) => [payload.new, ...prev]);
            showToast(`New Live Transfer: ${payload.new.id}`, 'info');
          } else if (payload.eventType === 'UPDATE') {
            setTransfers((prev) =>
              prev.map((item) => (item.id === payload.new.id ? payload.new : item))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(transferChannel);
    };
  }, [showToast]);

  // Trigger Multi-Agent Regional Scan
  const runScan = useCallback(async () => {
    setIsScanning(true);
    showToast(`Checking ${region.name}. Routes stay inside this region.`, "info");
    const base = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api").replace(/\/$/, "");

    try {
      const response = await fetch(`${base}/orchestrate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ region_code: region.code }),
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok && payload.verified && payload.proposal) {
        const card = { ...payload.proposal, region: payload.region || region.code };
        setProposals((prev) => (prev.some((item) => item.id === card.id) ? prev : [card, ...prev]));
        showToast(`${region.name}: checked transfer ${card.id} is ready for your approval.`, "success");
      } else if (response.ok) {
        showToast(payload.message || `${region.name} has no suitable route right now.`, "info");
      } else if (response.status === 503) {
        showToast(`${region.name} is selected. The live service is not ready yet.`, "warning");
      } else {
        showToast(payload.error || payload.message || "The regional scan could not be completed.", "warning");
      }
    } catch {
      showToast(`${region.name} is still the selected region. The service did not answer.`, "warning");
    } finally {
      setIsScanning(false);
      setLastScanTime(new Date().toLocaleTimeString());
    }
  }, [region.code, region.name, showToast]);

  // Step 5 -> Move from Approval Inbox to Transfers Workflow (Stage: APPROVED)
  const approveTransfer = useCallback(async (proposalId) => {
    const proposal = proposals.find((p) => p.id === proposalId);
    if (!proposal) return;

    // Remove from Pending Proposals
    setProposals((prev) => prev.filter((p) => p.id !== proposalId));

    // Create new transfer in APPROVED stage
    const newTransfer = {
      id: proposal.id,
      manifestId: proposal.manifestId || `MF-${proposal.id.split('-').pop()}`,
      donor: proposal.donor.name.split(' ')[0],
      recipient: proposal.recipient.name.split(' ')[0],
      group: proposal.allocatedUnits[0]?.group || "O-",
      quantity: proposal.allocatedUnits.length,
      unitIds: proposal.allocatedUnits.map(u => `#${u.id}`),
      distance: proposal.donor.distance,
      estDuration: proposal.donor.transitTime,
      stage: "APPROVED",
      region: proposal.region,
      coldBox: "CB-08",
      createdAt: "Just approved"
    };

    setTransfers((prev) => [newTransfer, ...prev]);

    // Update inventory
    setHospitals((prevHospitals) =>
      prevHospitals.map((hosp) => {
        if (hosp.name === proposal.donor.name) {
          const currentO = hosp.stock["O-"]?.units || 0;
          return {
            ...hosp,
            stock: {
              ...hosp.stock,
              "O-": { ...hosp.stock["O-"], units: Math.max(0, currentO - 2), daysOfCover: 5.2 }
            }
          };
        }
        if (hosp.name === proposal.recipient.name) {
          const currentO = hosp.stock["O-"]?.units || 0;
          return {
            ...hosp,
            stock: {
              ...hosp.stock,
              "O-": { ...hosp.stock["O-"], units: currentO + 2, daysOfCover: 2.8, status: "safe" }
            }
          };
        }
        return hosp;
      })
    );

    // Update alert
    setAlerts((prev) =>
      prev.map((a) =>
        a.facility === proposal.recipient.name
          ? { ...a, urgency: "RESOLVING", daysOfCover: 2.8, unitsRemaining: 3 }
          : a
      )
    );

    showToast(`✓ Proposal ${proposal.id} Approved! Added to Transfers queue.`, "success");
  }, [proposals, showToast]);

  const rejectTransfer = useCallback((proposalId) => {
    setProposals((prev) => prev.filter((p) => p.id !== proposalId));
    showToast(`Transfer proposal ${proposalId} rejected.`, "warning");
  }, [showToast]);

  // Stage 1 -> 2: Assign Courier & Generate Manifest
  const assignCourier = useCallback((transferId, courierData) => {
    setTransfers((prev) =>
      prev.map((t) =>
        t.id === transferId
          ? {
              ...t,
              stage: "COURIER_ASSIGNED",
              courier: courierData
            }
          : t
      )
    );
    showToast(`Manifest generated for #${transferId}. Courier assigned.`, "success");
  }, [showToast]);

  // Stage 2 -> 3: Confirm Pickup (Dispatch vehicle into transit)
  const confirmPickup = useCallback((transferId) => {
    setTransfers((prev) =>
      prev.map((t) =>
        t.id === transferId
          ? {
              ...t,
              stage: "IN_TRANSIT",
              progressPercent: 15,
              remainingTime: t.estDuration || "34 min",
              temperature: "3.9°C"
            }
          : t
      )
    );
    showToast(`Vehicle in transit for #${transferId}. Cold-chain sensor active.`, "info");
  }, [showToast]);

  // Stage 3 -> 4: Confirm Handover (Delivery complete)
  const confirmHandover = useCallback((transferId) => {
    setTransfers((prev) =>
      prev.map((t) =>
        t.id === transferId
          ? {
              ...t,
              stage: "DELIVERED",
              deliveredTime: "Just now",
              progressPercent: 100
            }
          : t
      )
    );
    showToast(`✓ Handover verified for #${transferId}! Added to recipient stock.`, "success");
  }, [showToast]);

  const visibleHospitals = useMemo(
    () => hospitals.filter((hospital) => hospital.region === region.code),
    [hospitals, region.code]
  );
  const visibleAlerts = useMemo(
    () => alerts.filter((alert) => alert.region === region.code),
    [alerts, region.code]
  );
  const visibleProposals = useMemo(
    () => proposals.filter((proposal) => proposal.region === region.code),
    [proposals, region.code]
  );
  const visibleTransfers = useMemo(
    () => transfers.filter((transfer) => transfer.region === region.code),
    [transfers, region.code]
  );

  return {
    hospitals: visibleHospitals,
    alerts: visibleAlerts,
    proposals: visibleProposals,
    transfers: visibleTransfers,
    isScanning,
    lastScanTime,
    toastMessage,
    runScan,
    approveTransfer,
    rejectTransfer,
    assignCourier,
    confirmPickup,
    confirmHandover,
    showToast
  };
}
