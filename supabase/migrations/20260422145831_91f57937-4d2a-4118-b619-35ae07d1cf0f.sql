-- Promote teste user to admin
UPDATE public.user_roles 
SET role = 'admin' 
WHERE user_id = '78940901-1dc7-4ba1-a566-821c0b4569ce';