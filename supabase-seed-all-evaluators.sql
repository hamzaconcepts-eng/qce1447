-- Seed all evaluator accounts
-- Run this in the Supabase SQL editor
-- Passwords are random 4-digit numbers
--
-- | الاسم                | Username   | Password |
-- |----------------------|------------|----------|
-- | خالد الفارسي         | kfarsi     | 6544     |
-- | أسعد العامري         | aamri      | 1631     |
-- | أسامة الشكيري        | ushukairi  | 3831     |
-- | محمد الراجحي         | mrajhi     | 2878     |
-- | محمد البطاشي         | mbattashi  | 6990     |
-- | عبدالعزيز المعمري    | amamari    | 4743     |
-- | ناصر المسكري         | nmaskari   | 6700     |
-- | كمال الهنائي         | khinaai    | 3682     |
-- | إدريس الحارثي        | iharthi    | 2439     |
-- | زيد المقيمي          | zmuqaimi   | 3487     |
-- | المقيمة الأولى       | eval1      | 6330     |
-- | المقيمة الثانية      | eval2      | 8508     |
-- | المقيمة الثالثة      | eval3      | 9191     |
-- | المقيمة الرابعة      | eval4      | 6745     |
-- | المقيمة الخامسة      | eval5      | 6344     |
-- | المقيمة السادسة      | eval6      | 1276     |
-- | المقيمة السابعة      | eval7      | 5156     |
-- | المقيمة الثامنة      | eval8      | 7876     |
-- | المقيمة التاسعة      | eval9      | 9049     |
-- | المقيمة العاشرة      | eval10     | 6120     |
-- | مروة الوهيبية        | mwaheibi   | 5926     |
-- | عتاب المجيزية        | emujaizi   | 1581     |
-- | أمجد العمري          | amjad.amri | 7547     |

INSERT INTO users (username, password_hash, role, name) VALUES
  ('kfarsi',    '$2b$10$qopSPEW4jcunQ4rjRSK0IeA0hnapxo.zgrqII.GfU15w6Dfltb/ya', 'evaluator', 'خالد الفارسي'),
  ('aamri',     '$2b$10$DJzhBv80bHuQtrIt7WIf8O5OAgd5v70Cp589JDJN/3b6iPPKZbEY.',  'evaluator', 'أسعد العامري'),
  ('ushukairi', '$2b$10$qo2wOTrOPp1.B/bEDYIh7eyNslkKWHy5MO7n8kXn97b4fBd.4ZTMW', 'evaluator', 'أسامة الشكيري'),
  ('mrajhi',    '$2b$10$9cM4oCIsP0RG4sVbmkkTc.ytcB8oI88j9ampdV.sH4alGNxNAsWsq',  'evaluator', 'محمد الراجحي'),
  ('mbattashi', '$2b$10$9BPnKv0I3XbVLZneWl99s.5zwjJ0HH5iDZECIP8UR0TbuOIellKK2',  'evaluator', 'محمد البطاشي'),
  ('amamari',   '$2b$10$YH8j4AhkQKK1G8U2AWqj9.CSY2KBhFJjDgYQSempXeDwH2DPQs0xm',  'evaluator', 'عبدالعزيز المعمري'),
  ('nmaskari',  '$2b$10$VKh/xOuoVYuoV0f.zECedOG5CNSsFVlo4PN7AY4M88laeHt.7REbS',  'evaluator', 'ناصر المسكري'),
  ('khinaai',   '$2b$10$mAoAtWXa2ErUe6QOBwaeuOxzF7PU8bZtQpdoUroWhJaR5e4wogvnS',  'evaluator', 'كمال الهنائي'),
  ('iharthi',   '$2b$10$id32wVQ3KbN1KDGkEEzzd.4FXda5Cvoq48Cdx9DQmCd/0ONacDRyy',  'evaluator', 'إدريس الحارثي'),
  ('zmuqaimi',  '$2b$10$VHOQTB7X7Tt722PEPXr5/.OpDATww.E/Cqk8pueQeV0UqmYoS8uwu',  'evaluator', 'زيد المقيمي'),
  ('eval1',     '$2b$10$bdWoZDtv0lsN1P6FyoVSROztuHzc/gTPJ3K6f5hhbM3X509nPl6nO',  'evaluator', 'المقيمة الأولى'),
  ('eval2',     '$2b$10$LE3pS1JF3ZYqNdhoaUYY7OqEylrTmKHSc5PzhK9UyE7WlB.A739aC',  'evaluator', 'المقيمة الثانية'),
  ('eval3',     '$2b$10$Cji4QcYYpPpU2KHdm0hPQuDOmDjaLGdof89zg8zN1.PpHx6i7cfAq',  'evaluator', 'المقيمة الثالثة'),
  ('eval4',     '$2b$10$DNNAyNHOBIT.zN3ZzpxGX.I1g2.uhEU71fHfzUa.DJb2r46lXUaXW',  'evaluator', 'المقيمة الرابعة'),
  ('eval5',     '$2b$10$Mdyap8Z2WwrZS0iO8.4n4.nykLCFnTFDdm/o2VEplUrxmUsdNa/2O',  'evaluator', 'المقيمة الخامسة'),
  ('eval6',     '$2b$10$.91v4CcjqnfSQ7mcmLBUO.ZCG3CscOL43xtTWQ/5DGSKg32Mn934e',  'evaluator', 'المقيمة السادسة'),
  ('eval7',     '$2b$10$a0rge59o5nSslSs1ykBWZeWz5DXeJ0cUmC1SEk3fdaDEDZ5QlwQKa',  'evaluator', 'المقيمة السابعة'),
  ('eval8',     '$2b$10$JEPcsMpNMqO.5jQj8w/yBu1X8B9BUEGuh9T97khYYOd.VRk2ElgyC',  'evaluator', 'المقيمة الثامنة'),
  ('eval9',     '$2b$10$t///I2YXP4kD8QWzowW/reKDsD/wlexQJZYmpPjtSDge84GOiyViG',   'evaluator', 'المقيمة التاسعة'),
  ('eval10',    '$2b$10$MjhHoUQTF0MH9S5KSZCm4elsNyEMXuy1BZAHuf.xgHf3c1rkD5xXi',  'evaluator', 'المقيمة العاشرة'),
  ('mwaheibi',  '$2b$10$XOwx.0n4pMAkvKO5cvIMZOUAbbvRhP.fTdB3.9xziPREQgZsAbWVq',  'evaluator', 'مروة الوهيبية'),
  ('emujaizi',  '$2b$10$QphVQ.9zdRss8C0t7Giasu6lFGnxGb8oTxbYauidxv8BfL9WcBKpq',  'evaluator', 'عتاب المجيزية'),
  ('amjad.amri','$2b$10$k4cxjDvGcz88yM9xDHCr2exZTTmLZTB/yGqHFsAGe7q4t70eF.JSK',  'evaluator', 'أمجد العمري')
ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash;
