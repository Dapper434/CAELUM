"""HTTP errors raised by the CAELUM service layer."""

from __future__ import annotations


class CaelumError(Exception):
    """A failure the API can show to the React client without a stack trace."""

    def __init__(self, message: str, *, status_code: int = 400, code: str = "error") -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code


class InsufficientHistory(Exception):
    """A facility does not have enough daily issues for Holt-Winters."""

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message
