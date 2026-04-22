
-- Ensure each user can only be linked to one doctor
CREATE UNIQUE INDEX IF NOT EXISTS doctors_user_id_unique 
  ON public.doctors(user_id) 
  WHERE user_id IS NOT NULL;

-- Billing entries (monthly billing records per doctor)
CREATE TABLE public.billing_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.payment_categories(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  reference_month DATE NOT NULL,
  gross_amount NUMERIC NOT NULL DEFAULT 0,
  retention_amount NUMERIC NOT NULL DEFAULT 0,
  repasse_amount NUMERIC NOT NULL DEFAULT 0,
  fixed_fee_amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_billing_entries_doctor ON public.billing_entries(doctor_id);
CREATE INDEX idx_billing_entries_month ON public.billing_entries(reference_month);

ALTER TABLE public.billing_entries ENABLE ROW LEVEL SECURITY;

-- Admins: full access
CREATE POLICY "Admins can manage billing entries"
  ON public.billing_entries
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Doctors: can only view their own entries (matched via doctors.user_id)
CREATE POLICY "Doctors can view their own billing entries"
  ON public.billing_entries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.doctors d
      WHERE d.id = billing_entries.doctor_id
        AND d.user_id = auth.uid()
    )
  );

-- Auto-update updated_at
CREATE TRIGGER update_billing_entries_updated_at
  BEFORE UPDATE ON public.billing_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
