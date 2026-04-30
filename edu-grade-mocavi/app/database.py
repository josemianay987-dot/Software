from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool
import os
from dotenv import load_dotenv

# Cargamos las variables del archivo .env
load_dotenv()

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")
# echo de SQL solo si SQL_ECHO=1 (off por defecto incluso en dev,
# porque saturaba la consola y añadía latencia perceptible)
SQL_ECHO = os.getenv("SQL_ECHO", "0") == "1"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    echo=SQL_ECHO,
    poolclass=QueuePool,
    pool_size=10,
    max_overflow=20,
    pool_recycle=3600,
    pool_pre_ping=True,
)

# Cada instancia de SessionLocal será una sesión de base de datos
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Clase base para nuestros modelos
Base = declarative_base()

# Dependencia para obtener la DB en los endpoints
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()