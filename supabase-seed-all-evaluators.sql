-- Seed all evaluator accounts
-- Run this in the Supabase SQL editor
-- Passwords are randomly generated (10 characters, alphanumeric)
--
-- | الاسم                | Username   | Password   |
-- |----------------------|------------|------------|
-- | خالد الفارسي         | kfarsi     | BsGz2BX9W6 |
-- | أسعد العامري         | aamri      | WrcZTJeaPK |
-- | أسامة الشكيري        | ushukairi  | GDVsN5H7BG |
-- | محمد الراجحي         | mrajhi     | xjhyRD9YYK |
-- | محمد البطاشي         | mbattashi  | tzqWXmhkJy |
-- | عبدالعزيز المعمري    | amamari    | aLu5gMbVqv |
-- | ناصر المسكري         | nmaskari   | D4teEj6Sbm |
-- | كمال الهنائي         | khinaai    | vrV4jRsw7e |
-- | إدريس الحارثي        | iharthi    | aeX4sqnPjp |
-- | زيد المقيمي          | zmuqaimi   | UbhrZ6pkfW |
-- | المقيمة الأولى       | eval1      | 6JvN67eCMk |
-- | المقيمة الثانية      | eval2      | ETpJhyFPtR |
-- | المقيمة الثالثة      | eval3      | 9aZZpc9DkY |
-- | المقيمة الرابعة      | eval4      | WsnDFj2FQq |
-- | المقيمة الخامسة      | eval5      | pakBvXsvJs |
-- | المقيمة السادسة      | eval6      | MaCj4F3fvb |
-- | المقيمة السابعة      | eval7      | hcXJpsHqb7 |
-- | المقيمة الثامنة      | eval8      | NUNS5PnYKU |
-- | المقيمة التاسعة      | eval9      | wchvkEjGRG |
-- | المقيمة العاشرة      | eval10     | mBpfD2DWht |

INSERT INTO users (username, password_hash, role, name) VALUES
  ('kfarsi',    '$2b$10$.5atp4vlz2z1kbB/42wvP.D8rhQGr7O.lX5yQRi3g/A1H7b1cN59i', 'evaluator', 'خالد الفارسي'),
  ('aamri',     '$2b$10$YCSvX.3WWl0tR3vBkr27duL9eSyY/pwPsu6kXQZzavUEJy/5sMxEa',  'evaluator', 'أسعد العامري'),
  ('ushukairi', '$2b$10$Q0Quxa4sDFibkc48HgTCleUVqmTAs54wONRxp/8wcvzBnsRCkyPyy',  'evaluator', 'أسامة الشكيري'),
  ('mrajhi',    '$2b$10$Trx3lG1kY128zYIkLZVEj.GxXp7rlorcY9P1nszMrYKB8iwAV3MOi',  'evaluator', 'محمد الراجحي'),
  ('mbattashi', '$2b$10$QPWKrg58x6fVXDFYT5g0n.ts7FXAzZ7pniWoqOVC7A7AqRuGuGB1u',  'evaluator', 'محمد البطاشي'),
  ('amamari',   '$2b$10$CVydTMeNnjcifdV8QlqRx.IgmAkSBctiy679ENA2Ezhj6Z.dsHw1i',  'evaluator', 'عبدالعزيز المعمري'),
  ('nmaskari',  '$2b$10$Zee/EyHQslYEV2GRVEJVgOKasw8SR8Ea.wdKwdz2B7gDs9NxiE4X6',  'evaluator', 'ناصر المسكري'),
  ('khinaai',   '$2b$10$GMH6AMAj0XI9Z4ElrDU/MOdPSd2SfOQKn.oX/cIP2NC6e1ZRVFxd.',  'evaluator', 'كمال الهنائي'),
  ('iharthi',   '$2b$10$/hbYpQg7cTRedxuWen.hI.Cxq7CrrZV0XL87o73yOnf2pEXWjtKES',  'evaluator', 'إدريس الحارثي'),
  ('zmuqaimi',  '$2b$10$KSUOzJlxLVl.ERU1rwmJtOcD0L33VBs8Js.DpfCnOj95w2aLWXmQe', 'evaluator', 'زيد المقيمي'),
  ('eval1',     '$2b$10$5Uh7igjYxL4iauQcixx/eefKiH2K05e9Y/gTcFK/Pm44ohET6mFMi',  'evaluator', 'المقيمة الأولى'),
  ('eval2',     '$2b$10$Eug9UwQR2yKKPJJhWUPxY.47NDLF82IuaT3voFrM9DH3tXdqMBdzK',  'evaluator', 'المقيمة الثانية'),
  ('eval3',     '$2b$10$OoffIQ5szxrpXZUSx/jQBuVv/essi68RWATo9sb0W2lNnNaO7EZfy',   'evaluator', 'المقيمة الثالثة'),
  ('eval4',     '$2b$10$.84hcc8lfjLMsCvyA3cxyeysgEEDzaQ7SqdzItVFvKK6l80YBkkX6',   'evaluator', 'المقيمة الرابعة'),
  ('eval5',     '$2b$10$GWuKHDLdnIaVoQSsfhhkLOGNlqVWYPvAoL9slvRTW2L3ugK5/ZG.2',  'evaluator', 'المقيمة الخامسة'),
  ('eval6',     '$2b$10$mh17HDuIBXwoCR/BFZYUzOkQFUmMspRijPR8upuCh1nvCP.qz/d4G',  'evaluator', 'المقيمة السادسة'),
  ('eval7',     '$2b$10$qn.HWNo.dU0GnRn/e1rfnufE18NpUVb9hiaE1hJfJZ3DHnY2Mj.2W',  'evaluator', 'المقيمة السابعة'),
  ('eval8',     '$2b$10$t.5al3fRIgqN9SISQ3HBkuSL1xEm4xMgYymdvt61GJK5IdLejJkRi',  'evaluator', 'المقيمة الثامنة'),
  ('eval9',     '$2b$10$vknzMVHmfvdWXtY//rrUj.L9s18eDgQooUey.JkTsehGjxWDIhOH6',  'evaluator', 'المقيمة التاسعة'),
  ('eval10',    '$2b$10$QPpoMwohQxGQwZ0764bw8udYR777AtTgOM8I3OTzPZATatmA.347O',   'evaluator', 'المقيمة العاشرة')
ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash;
