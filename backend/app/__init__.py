"""CAELUM Flask application.

Start it from the backend directory with ``python run.py`` or ``python -m app``.
A file named app.py cannot sit beside this package: Python would import that
file instead of the package and ``app.routes`` would fail to load.
"""

from __future__ import annotations

import logging
import os

from flask import Flask, jsonify
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

from app.db.supabase_client import load_env
from app.errors import CaelumError


def create_app() -> Flask:
    """Build the API, enable CORS, and register the JSON error handlers."""
    load_env()
    _configure_logging()
    app = Flask(__name__)
    origins = os.getenv("CORS_ORIGINS", "*").strip() or "*"
    allowed = origins if origins == "*" else [item.strip() for item in origins.split(",") if item.strip()]
    CORS(app, resources={r"/api/*": {"origins": allowed}})

    from app.routes import api

    app.register_blueprint(api, url_prefix="/api")

    @app.errorhandler(CaelumError)
    def handle_caelum(exc: CaelumError):
        return jsonify(error=exc.message, code=exc.code), exc.status_code

    @app.errorhandler(HTTPException)
    def handle_http(exc: HTTPException):
        return jsonify(error=exc.description, code="http_error"), exc.code

    @app.errorhandler(Exception)
    def handle_unexpected(exc: Exception):
        logging.getLogger(__name__).exception("Unhandled CAELUM error")
        return jsonify(error="Internal server error.", code="internal_error"), 500

    return app


def _configure_logging() -> None:
    level = os.getenv("LOG_LEVEL", "INFO").upper()
    logging.basicConfig(level=getattr(logging, level, logging.INFO))
