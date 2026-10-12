-- ============================================================================
-- Migration: Employee Face Biometric Credentials & Security
-- Tracks encrypted biometric templates, model versions, registration status,
-- and rate-limiting lockout records.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.employee_face_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    biometric_template TEXT NOT NULL, -- AES-GCM encrypted biometric vector payload
    model_version TEXT NOT NULL DEFAULT 'v4-contour-lbp-aes',
    registration_status TEXT NOT NULL DEFAULT 'registered' CHECK (registration_status IN ('registered', 'revoked', 'locked')),
    registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_verified_at TIMESTAMPTZ,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_employee_face_credential UNIQUE (employee_id)
);

CREATE INDEX IF NOT EXISTS idx_face_credentials_employee_id ON public.employee_face_credentials(employee_id);
CREATE INDEX IF NOT EXISTS idx_face_credentials_status ON public.employee_face_credentials(registration_status);

-- Enable RLS
ALTER TABLE public.employee_face_credentials ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view only status/audit fields, not raw templates
CREATE POLICY "Employees can view own face credentials"
    ON public.employee_face_credentials
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() IN (
            SELECT u.id FROM public.users u WHERE u.employee_id = employee_id
        ) OR EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.roles r ON u.role_id = r.id
            WHERE u.id = auth.uid() AND r.name IN ('Admin', 'HR')
        )
    );

-- Allow authenticated users to insert/update their own credential or Admins
CREATE POLICY "Employees can manage own face credentials"
    ON public.employee_face_credentials
    FOR ALL
    TO authenticated
    USING (
        auth.uid() IN (
            SELECT u.id FROM public.users u WHERE u.employee_id = employee_id
        ) OR EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.roles r ON u.role_id = r.id
            WHERE u.id = auth.uid() AND r.name IN ('Admin', 'HR')
        )
    );
