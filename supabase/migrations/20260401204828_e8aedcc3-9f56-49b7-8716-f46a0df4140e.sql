
-- Doctors table
CREATE TABLE public.doctors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID UNIQUE,
  name TEXT NOT NULL,
  specialty TEXT,
  crm TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view doctors"
ON public.doctors FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage doctors"
ON public.doctors FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_doctors_updated_at
BEFORE UPDATE ON public.doctors
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Payment categories table
CREATE TABLE public.payment_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  calculation_type TEXT NOT NULL DEFAULT 'percentage' CHECK (calculation_type IN ('percentage', 'fixed_fee')),
  retention_percentage NUMERIC NOT NULL DEFAULT 0,
  repasse_percentage NUMERIC NOT NULL DEFAULT 0,
  fixed_fee NUMERIC NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view categories"
ON public.payment_categories FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage categories"
ON public.payment_categories FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_payment_categories_updated_at
BEFORE UPDATE ON public.payment_categories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Doctor-specific category rules (overrides defaults)
CREATE TABLE public.doctor_category_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.payment_categories(id) ON DELETE CASCADE,
  retention_percentage NUMERIC,
  repasse_percentage NUMERIC,
  fixed_fee NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(doctor_id, category_id)
);

ALTER TABLE public.doctor_category_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view rules"
ON public.doctor_category_rules FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage rules"
ON public.doctor_category_rules FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_doctor_category_rules_updated_at
BEFORE UPDATE ON public.doctor_category_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
