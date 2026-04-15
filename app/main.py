"""
Restaurante PDV - Aplicação principal Flask.
"""
import os
import logging
from flask import Flask, render_template

from app.database import init_db
from app.routes_cadastros import bp as cadastros_bp
from app.routes_pedidos import bp as pedidos_bp

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(
            os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'database', 'app.log'),
            encoding='utf-8'
        )
    ]
)
logger = logging.getLogger(__name__)


def create_app():
    """Factory do app Flask."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    app = Flask(
        __name__,
        template_folder=os.path.join(base_dir, 'templates'),
        static_folder=os.path.join(base_dir, 'static')
    )

    app.config['SECRET_KEY'] = 'restaurante-pdv-local'
    app.config['JSON_SORT_KEYS'] = False

    # Registrar blueprints
    app.register_blueprint(cadastros_bp)
    app.register_blueprint(pedidos_bp)

    # Rota principal - SPA
    @app.route('/')
    def index():
        return render_template('index.html')

    # Inicializar banco
    with app.app_context():
        init_db()
        logger.info("Banco de dados inicializado")

    logger.info("Restaurante PDV iniciado")
    return app
