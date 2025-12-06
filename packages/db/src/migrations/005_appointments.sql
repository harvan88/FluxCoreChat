-- Migration: Appointments Extension Tables
-- Hito 7: Sistema de Turnos

-- Servicios ofrecidos
CREATE TABLE IF NOT EXISTS appointment_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  duration INTEGER NOT NULL DEFAULT 30,
  price INTEGER,
  currency VARCHAR(3) DEFAULT 'ARS',
  active BOOLEAN DEFAULT true NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT now() NOT NULL,
  updated_at TIMESTAMP DEFAULT now() NOT NULL
);

-- Personal/empleados
CREATE TABLE IF NOT EXISTS appointment_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  linked_account_id UUID REFERENCES accounts(id),
  services JSONB DEFAULT '[]'::jsonb,
  schedule JSONB DEFAULT '{}'::jsonb,
  active BOOLEAN DEFAULT true NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT now() NOT NULL,
  updated_at TIMESTAMP DEFAULT now() NOT NULL
);

-- Turnos/citas
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  client_account_id UUID NOT NULL REFERENCES accounts(id),
  service_id UUID NOT NULL REFERENCES appointment_services(id),
  staff_id UUID REFERENCES appointment_staff(id),
  
  date TIMESTAMP NOT NULL,
  duration INTEGER NOT NULL,
  
  status VARCHAR(20) DEFAULT 'pending' NOT NULL,
  notes TEXT,
  cancellation_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_by VARCHAR(20) DEFAULT 'customer' NOT NULL,
  
  confirmed_at TIMESTAMP,
  completed_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now() NOT NULL,
  updated_at TIMESTAMP DEFAULT now() NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_appt_services_account ON appointment_services(account_id);
CREATE INDEX IF NOT EXISTS idx_appt_staff_account ON appointment_staff(account_id);
CREATE INDEX IF NOT EXISTS idx_appointments_account ON appointments(account_id);
CREATE INDEX IF NOT EXISTS idx_appointments_client ON appointments(client_account_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_service ON appointments(service_id);
CREATE INDEX IF NOT EXISTS idx_appointments_staff ON appointments(staff_id);
