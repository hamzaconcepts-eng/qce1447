-- Seed all evaluator accounts
-- Run this in the Supabase SQL editor
-- Passwords are 6-digit numbers (see table below)
--
-- | الاسم                | Username   | Password |
-- |----------------------|------------|----------|
-- | خالد الفارسي         | kfarsi     | 100001   |
-- | أسعد العامري         | aamri      | 100002   |
-- | أسامة الشكيري        | ushukairi  | 100003   |
-- | محمد الراجحي         | mrajhi     | 100004   |
-- | محمد البطاشي         | mbattashi  | 100005   |
-- | عبدالعزيز المعمري    | amamari    | 100006   |
-- | ناصر المسكري         | nmaskari   | 100007   |
-- | كمال الهنائي         | khinaai    | 100008   |
-- | إدريس الحارثي        | iharthi    | 100009   |
-- | زيد المقيمي          | zmuqaimi   | 100010   |
-- | المقيمة الأولى       | eval1      | 200001   |
-- | المقيمة الثانية      | eval2      | 200002   |
-- | المقيمة الثالثة      | eval3      | 200003   |
-- | المقيمة الرابعة      | eval4      | 200004   |
-- | المقيمة الخامسة      | eval5      | 200005   |
-- | المقيمة السادسة      | eval6      | 200006   |
-- | المقيمة السابعة      | eval7      | 200007   |
-- | المقيمة الثامنة      | eval8      | 200008   |
-- | المقيمة التاسعة      | eval9      | 200009   |
-- | المقيمة العاشرة      | eval10     | 200010   |

INSERT INTO users (username, password_hash, role, name) VALUES
  ('kfarsi',    '$2b$10$yFq1mRao.awXHniV2pA5q.ZdacHSIulqgq3rSPbz4woPp52GHmqZG', 'evaluator', 'خالد الفارسي'),
  ('aamri',     '$2b$10$W.n622C9uBYawulZYTkaweC22OpCpFairmefb89A5Ll0YtvnRbd5O',  'evaluator', 'أسعد العامري'),
  ('ushukairi', '$2b$10$izlfBQ6uKxTSrkqSiwreK.1wdAWdQbAF0Z3IcX6G.6ZQJIV.ZDhIy', 'evaluator', 'أسامة الشكيري'),
  ('mrajhi',    '$2b$10$cX3GISU5KSOlOwQKv8g.8ea..ZpP1UdF80A9k6deXYruO6JajcrKK', 'evaluator', 'محمد الراجحي'),
  ('mbattashi', '$2b$10$7NQ8l1FmK0/CCeR7Oajvy.9zAYGBb1PbqaXXZBWhrsmwPeZ4942Mi', 'evaluator', 'محمد البطاشي'),
  ('amamari',   '$2b$10$W1VFCIzVRyUJWNDf2jOhouqCYJW5pVOXHbcwF/Cf8Dxp91ZwXuSpW', 'evaluator', 'عبدالعزيز المعمري'),
  ('nmaskari',  '$2b$10$cBgyUh06xOb0Ld8FR7hnlOtLWVXOGhGErfJY8tWj1aL74vcs6hW9G', 'evaluator', 'ناصر المسكري'),
  ('khinaai',   '$2b$10$MFYQ.Kj7nCpvoyJO/ReJ1uKhtUcESYifMO7jhhdJ/NDaQQx9P8h8K', 'evaluator', 'كمال الهنائي'),
  ('iharthi',   '$2b$10$npnSNtnPUEwCwWo1kotM8.oK4FwREvEom.nmvJ3M6cu8fKgHvMBru',  'evaluator', 'إدريس الحارثي'),
  ('zmuqaimi',  '$2b$10$EmmCOhVf0w7sf0uB.1E1Aesr8yskMdgTheE8DJ.dDT7donykLXoVK', 'evaluator', 'زيد المقيمي'),
  ('eval1',     '$2b$10$N/9ACDy.aq79VU9pbzzcVulf1Bsg3Z8lEajboOeMAScorManVgE6G',  'evaluator', 'المقيمة الأولى'),
  ('eval2',     '$2b$10$dOjkF2NusyArt/yZXvSsHOnGgRb3thvWdaF6EndxftB42m/94n41m',  'evaluator', 'المقيمة الثانية'),
  ('eval3',     '$2b$10$LuYWdKq0oR78m8CU/UeEkOoktRqoR.fWKDOhUdB1UU5IegaAJzzGG', 'evaluator', 'المقيمة الثالثة'),
  ('eval4',     '$2b$10$UWJ.H0Bfy7ad0Bf1Y3CHZOyb4rHKBnJpnO.sRH/1YsfB8x/ZVITFe', 'evaluator', 'المقيمة الرابعة'),
  ('eval5',     '$2b$10$j69pvrS0wGrVgNb30isK/.uJukfX26TfSawFcER4X/amJVt3cmqMy',  'evaluator', 'المقيمة الخامسة'),
  ('eval6',     '$2b$10$AbpkfD8Z3PFspcpi7cRZOe0ReidSHWww3GxOzz7Z8DJJ0rhBxFOSu', 'evaluator', 'المقيمة السادسة'),
  ('eval7',     '$2b$10$caNWxNNrfCP8bveC5aNmd.nM4CYN80U7byjvUBTeceyXiUYNnO63i',  'evaluator', 'المقيمة السابعة'),
  ('eval8',     '$2b$10$n4YnB5xT2nB.WDf3YJuqoe7UchDZ28Zd90pxGOQghYp.0clqnm906',  'evaluator', 'المقيمة الثامنة'),
  ('eval9',     '$2b$10$I3K9Fjt7QH8PfzjbXBdzneE33.OSIKV9f3CY/7VfQAVZ5Sf9xf8eS',  'evaluator', 'المقيمة التاسعة'),
  ('eval10',    '$2b$10$kWInCML85v1bs5uDX3M.vumPXijESnqggk/uCXBQbMD9MZ9pZHRWa',  'evaluator', 'المقيمة العاشرة')
ON CONFLICT (username) DO NOTHING;
