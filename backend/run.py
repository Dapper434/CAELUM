"""Process entry for the CAELUM API.

    python run.py

The Flask app lives in the ``app`` package (``create_app``). Running a sibling
file named ``app.py`` would shadow that package, so this launcher is ``run.py``.
"""

from __future__ import annotations

import os

from app import create_app

app = create_app()

if __name__ == "__main__":
    app.run(
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "5000")),
        debug=os.getenv("FLASK_DEBUG", "0") == "1",
    )
