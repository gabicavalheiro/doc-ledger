
-- Create units table
CREATE TABLE public.units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage units" ON public.units FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view units" ON public.units FOR SELECT TO authenticated
  USING (true);

CREATE TRIGGER update_units_updated_at
  BEFORE UPDATE ON public.units
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add unit_id to doctor_category_rules
ALTER TABLE public.doctor_category_rules
  ADD COLUMN unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE;

-- Drop old unique constraint and create new one including unit_id
ALTER TABLE public.doctor_category_rules
  DROP CONSTRAINT IF EXISTS doctor_category_rules_doctor_id_category_id_key;

CREATE UNIQUE INDEX doctor_category_rules_unique_idx
  ON public.doctor_category_rules (doctor_id, category_id, COALESCE(unit_id, '00000000-0000-0000-0000-000000000000'));
