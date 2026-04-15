"""
Inicializador do Restaurante PDV.
Uso: python run.py
"""
import sys
import os

# Adicionar diretório raiz ao path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.main import create_app

app = create_app()

if __name__ == '__main__':
    print("\n" + "=" * 50)
    print("  RESTAURANTE PDV")
    print("  Acesse: http://localhost:5555")
    print("=" * 50 + "\n")

    # Em produção, usar waitress:
    # from waitress import serve
    # serve(app, host='0.0.0.0', port=5000)

    app.run(host='0.0.0.0', port=5555, debug=True)
