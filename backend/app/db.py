import os
from pathlib import Path
from sqlalchemy import create_engine, String, JSON
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

Path("data").mkdir(exist_ok=True)
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///data/roomai.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}, pool_pre_ping=True)
Session = sessionmaker(engine, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

class Record(Base):
    __tablename__ = "records"
    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    kind: Mapped[str] = mapped_column(String(30), index=True)
    owner: Mapped[str] = mapped_column(String(100), index=True)
    data: Mapped[dict] = mapped_column(JSON)

def initialize():
    Base.metadata.create_all(engine)
