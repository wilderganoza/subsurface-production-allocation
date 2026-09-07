"""Modelos del dominio: pozos, producción, petrofísica, intervenciones y resultados."""

# Importamos las librerias necesarias
from sqlalchemy import (  # Tipos de columna y restricciones
    Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint, func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID  # Tipos propios de PostgreSQL
from sqlalchemy.orm import relationship  # Relaciones entre modelos

from app.models.base import Base  # Registro declarativo compartido


# Guardamos el perfil de organización del usuario.
# Las credenciales viven en auth.users, gestionadas por Supabase Auth.
class UserProfile(Base):
    # Nombre de la tabla
    __tablename__ = "user_profiles"

    # Identificador, que es el mismo uuid de auth.users
    id = Column(UUID(as_uuid=True), primary_key=True)

    # Nombre completo para mostrar
    full_name = Column(String(255), nullable=False, default="")

    # Rol dentro de la aplicación: admin o engineer
    role = Column(String(50), nullable=False, default="engineer")

    # Si la cuenta está habilitada
    is_active = Column(Boolean, nullable=False, default=True)

    # Fecha de alta
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


# Guardamos un pozo y el modelo de declinación con que se asigna su producción.
class Well(Base):
    # Nombre de la tabla
    __tablename__ = "wells"

    # Identificador autoincremental
    id = Column(Integer, primary_key=True)

    # Usuario que lo creó; queda en null si se borra la cuenta
    user_id = Column(UUID(as_uuid=True), ForeignKey("user_profiles.id", ondelete="SET NULL"))

    # Nombre visible del pozo
    name = Column(String(200), nullable=False)

    # Modelo de declinación: exponential, hyperbolic, harmonic o best_fit
    decline_model = Column(String(50), nullable=False, default="best_fit")

    # Fechas de alta y última modificación
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(),
                        onupdate=func.now())

    # Datos asociados, todos borrados junto con el pozo
    production = relationship("ProductionRecord", back_populates="well",
                             cascade="all, delete-orphan", order_by="ProductionRecord.date")
    sands = relationship("SandProperty", back_populates="well",
                         cascade="all, delete-orphan", order_by="SandProperty.sand_name")
    intervention_dates = relationship("InterventionDate", back_populates="well",
                                      cascade="all, delete-orphan",
                                      order_by="InterventionDate.intervention_date")
    intervention_cells = relationship("InterventionCell", back_populates="well",
                                      cascade="all, delete-orphan")
    result = relationship("AllocationResult", back_populates="well",
                          cascade="all, delete-orphan", uselist=False)


# Guardamos un dato diario de producción total del pozo.
class ProductionRecord(Base):
    # Nombre de la tabla
    __tablename__ = "production_data"

    # Identificador autoincremental
    id = Column(Integer, primary_key=True)

    # Pozo al que pertenece
    well_id = Column(Integer, ForeignKey("wells.id", ondelete="CASCADE"), nullable=False)

    # Fecha del dato
    date = Column(Date, nullable=False)

    # Producción total del pozo ese día, en bbl/d
    total_production = Column(Float, nullable=False, default=0.0)

    # Un pozo no puede tener dos registros para la misma fecha
    __table_args__ = (UniqueConstraint("well_id", "date", name="production_data_well_id_date_key"),)

    # Pozo al que pertenece, para navegar en sentido inverso
    well = relationship("Well", back_populates="production")


# Guardamos la propiedad petrofísica de una arena: su k·h.
class SandProperty(Base):
    # Nombre de la tabla
    __tablename__ = "sand_properties"

    # Identificador autoincremental
    id = Column(Integer, primary_key=True)

    # Pozo al que pertenece
    well_id = Column(Integer, ForeignKey("wells.id", ondelete="CASCADE"), nullable=False)

    # Nombre de la arena
    sand_name = Column(String(100), nullable=False)

    # Permeabilidad por espesor, en md·ft. Es lo que pondera el reparto.
    kh = Column(Float, nullable=False)

    # Una arena no puede repetirse dentro del mismo pozo
    __table_args__ = (UniqueConstraint("well_id", "sand_name",
                                       name="sand_properties_well_id_sand_name_key"),)

    # Pozo al que pertenece, para navegar en sentido inverso
    well = relationship("Well", back_populates="sands")


# Guardamos una fecha de intervención, que abre o cierra arenas.
class InterventionDate(Base):
    # Nombre de la tabla
    __tablename__ = "intervention_dates"

    # Identificador autoincremental
    id = Column(Integer, primary_key=True)

    # Pozo al que pertenece
    well_id = Column(Integer, ForeignKey("wells.id", ondelete="CASCADE"), nullable=False)

    # Fecha del workover o completación
    intervention_date = Column(Date, nullable=False)

    # Orden de presentación en la matriz
    sort_order = Column(Integer, nullable=False, default=0)

    # Una fecha no puede repetirse dentro del mismo pozo
    __table_args__ = (UniqueConstraint("well_id", "intervention_date",
                                       name="intervention_dates_well_id_intervention_date_key"),)

    # Pozo al que pertenece, para navegar en sentido inverso
    well = relationship("Well", back_populates="intervention_dates")


# Guardamos una celda de la matriz: si una arena está abierta en una fecha.
class InterventionCell(Base):
    # Nombre de la tabla
    __tablename__ = "intervention_matrix"

    # Identificador autoincremental
    id = Column(Integer, primary_key=True)

    # Pozo al que pertenece
    well_id = Column(Integer, ForeignKey("wells.id", ondelete="CASCADE"), nullable=False)

    # Arena de la fila
    sand_name = Column(String(100), nullable=False)

    # Fecha de la columna
    intervention_date = Column(Date, nullable=False)

    # Si la arena está abierta en esa fecha
    is_open = Column(Boolean, nullable=False, default=False)

    # Una celda es única por pozo, arena y fecha
    __table_args__ = (
        UniqueConstraint("well_id", "sand_name", "intervention_date",
                         name="intervention_matrix_well_id_sand_name_intervention_date_key"),
    )

    # Pozo al que pertenece, para navegar en sentido inverso
    well = relationship("Well", back_populates="intervention_cells")


# Guardamos el resultado completo de la última asignación ejecutada.
class AllocationResult(Base):
    # Nombre de la tabla
    __tablename__ = "allocation_results"

    # Identificador autoincremental
    id = Column(Integer, primary_key=True)

    # Pozo al que pertenece; solo se guarda el último resultado
    well_id = Column(Integer, ForeignKey("wells.id", ondelete="CASCADE"),
                     nullable=False, unique=True)

    # Asignaciones, ajustes, avisos y decisiones, tal como los devuelve el motor
    results = Column(JSONB, nullable=False)

    # Momento del cálculo
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    # Pozo al que pertenece, para navegar en sentido inverso
    well = relationship("Well", back_populates="result")
