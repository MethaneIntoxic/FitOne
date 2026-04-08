// ========== EXERCISE DATABASE ==========
// Bundled exercise library with muscle group tags, autocomplete, and form cues
// Supplemented by Wger API (free, open-source) for additional exercises

const MUSCLE_GROUPS = {
  chest: 'Chest', back: 'Back', shoulders: 'Shoulders', biceps: 'Biceps',
  triceps: 'Triceps', forearms: 'Forearms', quads: 'Quads', hamstrings: 'Hamstrings',
  glutes: 'Glutes', calves: 'Calves', abs: 'Abs', obliques: 'Obliques',
  traps: 'Traps', lats: 'Lats', lowBack: 'Lower Back', hipFlexors: 'Hip Flexors',
};

const EQUIPMENT_TYPES = {
  barbell: 'Barbell', dumbbell: 'Dumbbell', machine: 'Machine',
  cable: 'Cable', bodyweight: 'Bodyweight', band: 'Band',
  kettlebell: 'Kettlebell', smith: 'Smith Machine', other: 'Other',
};

const EXERCISE_CACHE_KEY = 'ft_exercise_db_cache_v1';
const EXERCISE_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const TARGET_EXERCISE_COUNT = 220;

// ========== BUNDLED EXERCISES ==========
const EXERCISE_DB = [
  // === CHEST ===
  { name: 'Barbell Bench Press', primary: ['chest'], secondary: ['triceps','shoulders'], equipment: 'barbell', category: 'compound', tips: 'Retract shoulder blades, arch upper back, feet flat. Lower bar to mid-chest, press up and slightly back.' },
  { name: 'Incline Barbell Bench Press', primary: ['chest'], secondary: ['shoulders','triceps'], equipment: 'barbell', category: 'compound', tips: 'Set bench to 30-45°. Focus on upper chest squeeze at top.' },
  { name: 'Decline Barbell Bench Press', primary: ['chest'], secondary: ['triceps'], equipment: 'barbell', category: 'compound', tips: 'Set bench to 15-30° decline. Lower to lower chest.' },
  { name: 'Dumbbell Bench Press', primary: ['chest'], secondary: ['triceps','shoulders'], equipment: 'dumbbell', category: 'compound', tips: 'Allows greater ROM than barbell. Squeeze at top, control descent.' },
  { name: 'Incline Dumbbell Press', primary: ['chest'], secondary: ['shoulders','triceps'], equipment: 'dumbbell', category: 'compound', tips: 'Set bench 30-45°. Press up and slightly inward.' },
  { name: 'Dumbbell Fly', primary: ['chest'], secondary: [], equipment: 'dumbbell', category: 'isolation', tips: 'Slight bend in elbows throughout. Stretch at bottom, squeeze at top.' },
  { name: 'Incline Dumbbell Fly', primary: ['chest'], secondary: ['shoulders'], equipment: 'dumbbell', category: 'isolation', tips: 'Upper chest focus. Slight bend in elbows, wide arc motion.' },
  { name: 'Cable Crossover', primary: ['chest'], secondary: [], equipment: 'cable', category: 'isolation', tips: 'Step forward, slight lean. Bring hands together at lower chest height.' },
  { name: 'Machine Chest Press', primary: ['chest'], secondary: ['triceps','shoulders'], equipment: 'machine', category: 'compound', tips: 'Adjust seat so handles are at mid-chest. Push forward, control return.' },
  { name: 'Pec Deck', primary: ['chest'], secondary: [], equipment: 'machine', category: 'isolation', tips: 'Keep elbows slightly bent. Squeeze chest at the peak.' },
  { name: 'Push-Up', primary: ['chest'], secondary: ['triceps','shoulders','abs'], equipment: 'bodyweight', category: 'compound', tips: 'Body straight like a plank. Lower until chest nearly touches floor.' },
  { name: 'Dip (Chest)', primary: ['chest'], secondary: ['triceps','shoulders'], equipment: 'bodyweight', category: 'compound', tips: 'Lean forward ~30°, elbows flared. Go deeper for chest emphasis.' },

  // === BACK ===
  { name: 'Barbell Row', primary: ['back','lats'], secondary: ['biceps','traps'], equipment: 'barbell', category: 'compound', tips: 'Hinge at hips ~45°, pull bar to lower chest/upper belly. Squeeze lats.' },
  { name: 'Pendlay Row', primary: ['back','lats'], secondary: ['biceps','traps'], equipment: 'barbell', category: 'compound', tips: 'Start each rep from floor. Explosive pull, controlled lower.' },
  { name: 'Dumbbell Row', primary: ['back','lats'], secondary: ['biceps'], equipment: 'dumbbell', category: 'compound', tips: 'One arm at a time. Pull elbow toward hip, squeeze lat at top.' },
  { name: 'Seated Cable Row', primary: ['back','lats'], secondary: ['biceps','traps'], equipment: 'cable', category: 'compound', tips: 'Sit tall, pull to lower chest. Squeeze shoulder blades together.' },
  { name: 'Lat Pulldown', primary: ['lats'], secondary: ['biceps','back'], equipment: 'cable', category: 'compound', tips: 'Pull bar to upper chest. Lean back slightly, drive elbows down.' },
  { name: 'Pull-Up', primary: ['lats','back'], secondary: ['biceps'], equipment: 'bodyweight', category: 'compound', tips: 'Hang fully, pull chin over bar. Engage lats, don\'t swing.' },
  { name: 'Chin-Up', primary: ['lats','biceps'], secondary: ['back'], equipment: 'bodyweight', category: 'compound', tips: 'Underhand grip, pull chin over bar. More bicep involvement than pull-ups.' },
  { name: 'T-Bar Row', primary: ['back','lats'], secondary: ['biceps','traps'], equipment: 'barbell', category: 'compound', tips: 'Straddle the bar, pull to chest. Great for mid-back thickness.' },
  { name: 'Machine Row', primary: ['back'], secondary: ['biceps'], equipment: 'machine', category: 'compound', tips: 'Chest against pad. Pull handles to sides, squeeze shoulder blades.' },
  { name: 'Cable Face Pull', primary: ['traps','shoulders'], secondary: ['back'], equipment: 'cable', category: 'isolation', tips: 'Pull to forehead height, rotate hands outward. Great for posture.' },
  { name: 'Straight-Arm Pulldown', primary: ['lats'], secondary: [], equipment: 'cable', category: 'isolation', tips: 'Arms nearly straight, pull bar to thighs. Squeeze lats hard.' },
  { name: 'Deadlift', primary: ['back','hamstrings','glutes'], secondary: ['traps','quads','abs','forearms'], equipment: 'barbell', category: 'compound', tips: 'Flat back, hips hinge. Drive through heels, lock out hips at top.' },
  { name: 'Romanian Deadlift', primary: ['hamstrings','glutes'], secondary: ['back','lowBack'], equipment: 'barbell', category: 'compound', tips: 'Slight knee bend, hinge at hips. Feel hamstring stretch, drive hips through.' },
  { name: 'Rack Pull', primary: ['back','traps'], secondary: ['glutes','hamstrings'], equipment: 'barbell', category: 'compound', tips: 'Set pins at knee height. Focus on lockout and upper back.' },

  // === SHOULDERS ===
  { name: 'Overhead Press', primary: ['shoulders'], secondary: ['triceps','traps'], equipment: 'barbell', category: 'compound', tips: 'Press straight up from front shoulders. Lock out overhead, don\'t lean back excessively.' },
  { name: 'Dumbbell Shoulder Press', primary: ['shoulders'], secondary: ['triceps'], equipment: 'dumbbell', category: 'compound', tips: 'Press dumbbells up from shoulder height. Can be seated or standing.' },
  { name: 'Arnold Press', primary: ['shoulders'], secondary: ['triceps'], equipment: 'dumbbell', category: 'compound', tips: 'Start palms facing you, rotate as you press up. Full range of motion.' },
  { name: 'Lateral Raise', primary: ['shoulders'], secondary: [], equipment: 'dumbbell', category: 'isolation', tips: 'Raise to side until parallel with floor. Slight forward lean, control descent.' },
  { name: 'Cable Lateral Raise', primary: ['shoulders'], secondary: [], equipment: 'cable', category: 'isolation', tips: 'Constant tension throughout. Raise to shoulder height.' },
  { name: 'Front Raise', primary: ['shoulders'], secondary: [], equipment: 'dumbbell', category: 'isolation', tips: 'Raise in front to eye level. Alternate arms or both together.' },
  { name: 'Rear Delt Fly', primary: ['shoulders'], secondary: ['traps','back'], equipment: 'dumbbell', category: 'isolation', tips: 'Bend over, raise arms to sides. Squeeze rear delts at top.' },
  { name: 'Machine Shoulder Press', primary: ['shoulders'], secondary: ['triceps'], equipment: 'machine', category: 'compound', tips: 'Adjust seat so handles start at shoulder level. Press up, control down.' },
  { name: 'Upright Row', primary: ['shoulders','traps'], secondary: ['biceps'], equipment: 'barbell', category: 'compound', tips: 'Pull bar up to chin, elbows high. Use wide grip to reduce impingement risk.' },
  { name: 'Shrug', primary: ['traps'], secondary: [], equipment: 'barbell', category: 'isolation', tips: 'Elevate shoulders straight up toward ears. Hold at top, control descent.' },
  { name: 'Dumbbell Shrug', primary: ['traps'], secondary: [], equipment: 'dumbbell', category: 'isolation', tips: 'Shrug straight up, hold 1-2s at top. Heavy weight is fine.' },

  // === ARMS: BICEPS ===
  { name: 'Barbell Curl', primary: ['biceps'], secondary: ['forearms'], equipment: 'barbell', category: 'isolation', tips: 'Keep elbows at sides, curl to shoulder height. Don\'t swing.' },
  { name: 'Dumbbell Curl', primary: ['biceps'], secondary: ['forearms'], equipment: 'dumbbell', category: 'isolation', tips: 'Alternate or both arms. Supinate wrist at top for full contraction.' },
  { name: 'Hammer Curl', primary: ['biceps','forearms'], secondary: [], equipment: 'dumbbell', category: 'isolation', tips: 'Neutral grip (palms facing). Targets brachialis and brachioradialis.' },
  { name: 'Preacher Curl', primary: ['biceps'], secondary: [], equipment: 'barbell', category: 'isolation', tips: 'Pad locks upper arms. Full stretch at bottom, curl to top.' },
  { name: 'Incline Dumbbell Curl', primary: ['biceps'], secondary: [], equipment: 'dumbbell', category: 'isolation', tips: 'Bench at 45-60°. Arms hang straight, great stretch on long head.' },
  { name: 'Cable Curl', primary: ['biceps'], secondary: [], equipment: 'cable', category: 'isolation', tips: 'Constant tension. Curl to shoulder height, squeeze.' },
  { name: 'Concentration Curl', primary: ['biceps'], secondary: [], equipment: 'dumbbell', category: 'isolation', tips: 'Elbow against inner thigh. Isolates bicep peak.' },
  { name: 'EZ-Bar Curl', primary: ['biceps'], secondary: ['forearms'], equipment: 'barbell', category: 'isolation', tips: 'Angled grip reduces wrist strain. Standard bicep curl form.' },

  // === ARMS: TRICEPS ===
  { name: 'Close-Grip Bench Press', primary: ['triceps'], secondary: ['chest','shoulders'], equipment: 'barbell', category: 'compound', tips: 'Hands shoulder-width. Keep elbows close to body throughout.' },
  { name: 'Tricep Pushdown', primary: ['triceps'], secondary: [], equipment: 'cable', category: 'isolation', tips: 'Elbows at sides, push down until arms straight. Squeeze at bottom.' },
  { name: 'Overhead Tricep Extension', primary: ['triceps'], secondary: [], equipment: 'dumbbell', category: 'isolation', tips: 'Hold one dumbbell overhead with both hands. Lower behind head, extend up.' },
  { name: 'Skull Crusher', primary: ['triceps'], secondary: [], equipment: 'barbell', category: 'isolation', tips: 'Lower bar to forehead/behind head. Keep elbows pointing up, extend.' },
  { name: 'Tricep Dip', primary: ['triceps'], secondary: ['chest','shoulders'], equipment: 'bodyweight', category: 'compound', tips: 'Stay upright (not leaning forward). Lower until 90° at elbow.' },
  { name: 'Tricep Kickback', primary: ['triceps'], secondary: [], equipment: 'dumbbell', category: 'isolation', tips: 'Hinge forward, extend arm behind. Squeeze at full extension.' },
  { name: 'Cable Overhead Tricep Extension', primary: ['triceps'], secondary: [], equipment: 'cable', category: 'isolation', tips: 'Face away from cable, extend arms overhead. Great long head stretch.' },

  // === LEGS: QUADS ===
  { name: 'Barbell Squat', primary: ['quads','glutes'], secondary: ['hamstrings','abs','lowBack'], equipment: 'barbell', category: 'compound', tips: 'Bar on upper traps, chest up, break at hips and knees together. Depth: hip crease below knee.' },
  { name: 'Front Squat', primary: ['quads'], secondary: ['glutes','abs'], equipment: 'barbell', category: 'compound', tips: 'Bar on front delts, elbows high. More upright torso, quad dominant.' },
  { name: 'Hack Squat', primary: ['quads'], secondary: ['glutes'], equipment: 'machine', category: 'compound', tips: 'Shoulders under pads. Lower until 90° at knees, drive up.' },
  { name: 'Leg Press', primary: ['quads','glutes'], secondary: ['hamstrings'], equipment: 'machine', category: 'compound', tips: 'Feet shoulder-width on platform. Lower until 90° at knees, push through heels.' },
  { name: 'Leg Extension', primary: ['quads'], secondary: [], equipment: 'machine', category: 'isolation', tips: 'Extend legs fully, squeeze quads at top. Control the negative.' },
  { name: 'Walking Lunge', primary: ['quads','glutes'], secondary: ['hamstrings'], equipment: 'dumbbell', category: 'compound', tips: 'Long stride, front knee tracks over toes. Drive through front heel.' },
  { name: 'Bulgarian Split Squat', primary: ['quads','glutes'], secondary: ['hamstrings'], equipment: 'dumbbell', category: 'compound', tips: 'Rear foot on bench. Lower until front thigh is parallel. Great for imbalances.' },
  { name: 'Goblet Squat', primary: ['quads','glutes'], secondary: ['abs'], equipment: 'dumbbell', category: 'compound', tips: 'Hold dumbbell at chest. Great for beginners learning squat form.' },
  { name: 'Smith Machine Squat', primary: ['quads','glutes'], secondary: ['hamstrings'], equipment: 'smith', category: 'compound', tips: 'Feet slightly forward of bar. Guided path, good for learning.' },
  { name: 'Sissy Squat', primary: ['quads'], secondary: [], equipment: 'bodyweight', category: 'isolation', tips: 'Lean back, knees forward. Extreme quad stretch. Advanced movement.' },

  // === LEGS: HAMSTRINGS & GLUTES ===
  { name: 'Leg Curl', primary: ['hamstrings'], secondary: [], equipment: 'machine', category: 'isolation', tips: 'Curl weight toward glutes. Squeeze at top, control negative.' },
  { name: 'Seated Leg Curl', primary: ['hamstrings'], secondary: [], equipment: 'machine', category: 'isolation', tips: 'Curl pad under calves, pull toward you. Good hamstring isolation.' },
  { name: 'Stiff-Leg Deadlift', primary: ['hamstrings','glutes'], secondary: ['lowBack'], equipment: 'barbell', category: 'compound', tips: 'Legs nearly straight, hinge at hips. Feel deep hamstring stretch.' },
  { name: 'Dumbbell Romanian Deadlift', primary: ['hamstrings','glutes'], secondary: ['lowBack'], equipment: 'dumbbell', category: 'compound', tips: 'Same as barbell RDL but with dumbbells. More freedom of movement.' },
  { name: 'Hip Thrust', primary: ['glutes'], secondary: ['hamstrings'], equipment: 'barbell', category: 'compound', tips: 'Upper back on bench, bar on hips. Drive hips up, squeeze glutes hard at top.' },
  { name: 'Glute Bridge', primary: ['glutes'], secondary: ['hamstrings'], equipment: 'bodyweight', category: 'isolation', tips: 'Lie on back, feet flat. Push hips up, squeeze glutes at top.' },
  { name: 'Cable Pull-Through', primary: ['glutes','hamstrings'], secondary: ['lowBack'], equipment: 'cable', category: 'compound', tips: 'Face away from cable, hinge and pull through legs. Hip hinge pattern.' },
  { name: 'Good Morning', primary: ['hamstrings','lowBack'], secondary: ['glutes'], equipment: 'barbell', category: 'compound', tips: 'Bar on upper back, hinge forward with slight knee bend. Feel hamstring stretch.' },
  { name: 'Sumo Deadlift', primary: ['quads','glutes','hamstrings'], secondary: ['back','traps'], equipment: 'barbell', category: 'compound', tips: 'Wide stance, toes out. Grip inside knees. Drive hips through at top.' },

  // === CALVES ===
  { name: 'Standing Calf Raise', primary: ['calves'], secondary: [], equipment: 'machine', category: 'isolation', tips: 'Full stretch at bottom, rise onto toes at top. Pause at peak.' },
  { name: 'Seated Calf Raise', primary: ['calves'], secondary: [], equipment: 'machine', category: 'isolation', tips: 'Targets soleus. Sit with pad on knees, raise heels.' },
  { name: 'Donkey Calf Raise', primary: ['calves'], secondary: [], equipment: 'machine', category: 'isolation', tips: 'Bent at hips, rise onto toes. Great for full calf stretch.' },

  // === ABS & CORE ===
  { name: 'Crunch', primary: ['abs'], secondary: [], equipment: 'bodyweight', category: 'isolation', tips: 'Curl shoulders off floor, don\'t pull neck. Squeeze abs at top.' },
  { name: 'Hanging Leg Raise', primary: ['abs','hipFlexors'], secondary: ['obliques'], equipment: 'bodyweight', category: 'compound', tips: 'Hang from bar, raise legs to parallel or higher. Control the swing.' },
  { name: 'Cable Crunch', primary: ['abs'], secondary: [], equipment: 'cable', category: 'isolation', tips: 'Kneel facing cable, crunch down. Focus on ab contraction, not hip flexion.' },
  { name: 'Plank', primary: ['abs'], secondary: ['shoulders','lowBack'], equipment: 'bodyweight', category: 'isolation', tips: 'Straight line from head to heels. Engage core, don\'t let hips sag.' },
  { name: 'Ab Wheel Rollout', primary: ['abs'], secondary: ['shoulders','lats'], equipment: 'other', category: 'compound', tips: 'Roll out slowly, maintain flat back. Advanced: from standing.' },
  { name: 'Russian Twist', primary: ['obliques','abs'], secondary: [], equipment: 'bodyweight', category: 'isolation', tips: 'Lean back slightly, rotate side to side with weight. Control the twist.' },
  { name: 'Leg Raise', primary: ['abs','hipFlexors'], secondary: [], equipment: 'bodyweight', category: 'isolation', tips: 'Lie flat, raise legs to 90°. Lower slowly, don\'t arch back.' },
  { name: 'Mountain Climber', primary: ['abs'], secondary: ['shoulders','hipFlexors'], equipment: 'bodyweight', category: 'compound', tips: 'Plank position, drive knees toward chest alternating. Keep hips level.' },
  { name: 'Decline Sit-Up', primary: ['abs'], secondary: ['hipFlexors'], equipment: 'bodyweight', category: 'isolation', tips: 'Hook feet under pad, lower back fully, curl up. Add weight across chest when ready.' },
  { name: 'Woodchopper', primary: ['obliques','abs'], secondary: [], equipment: 'cable', category: 'compound', tips: 'Diagonal chop from high to low or low to high. Rotate through core.' },

  // === CARDIO / FULL BODY ===
  { name: 'Burpee', primary: ['quads','chest','shoulders'], secondary: ['abs','triceps'], equipment: 'bodyweight', category: 'compound', tips: 'Squat, kick back to push-up, push-up, jump up. Full body conditioning.' },
  { name: 'Kettlebell Swing', primary: ['glutes','hamstrings'], secondary: ['shoulders','abs','back'], equipment: 'kettlebell', category: 'compound', tips: 'Hinge at hips, swing bell to chest height. Power from hips, not arms.' },
  { name: 'Clean and Press', primary: ['shoulders','quads','glutes'], secondary: ['traps','triceps','back'], equipment: 'barbell', category: 'compound', tips: 'Pull bar from floor, catch at shoulders, press overhead. Olympic mechanics.' },
  { name: 'Thruster', primary: ['quads','shoulders'], secondary: ['glutes','triceps'], equipment: 'barbell', category: 'compound', tips: 'Front squat into overhead press in one fluid motion.' },
  { name: 'Farmer Walk', primary: ['forearms','traps'], secondary: ['abs','shoulders'], equipment: 'dumbbell', category: 'compound', tips: 'Heavy dumbbells at sides, walk with upright posture. Grip and core work.' },
  { name: 'Battle Ropes', primary: ['shoulders','abs'], secondary: ['back','biceps'], equipment: 'other', category: 'compound', tips: 'Alternate waves, slams, or circles. Keep core tight.' },
  { name: 'Box Jump', primary: ['quads','glutes'], secondary: ['calves','hamstrings'], equipment: 'other', category: 'compound', tips: 'Explosive jump onto box. Land softly with bent knees. Step down.' },
  { name: 'Sled Push', primary: ['quads','glutes'], secondary: ['calves','shoulders'], equipment: 'other', category: 'compound', tips: 'Low position, drive through legs. Great for conditioning.' },
];

function buildBundledExerciseExpansion() {
  const specs = [
    {
      names: ['Machine Incline Press', 'Smith Machine Bench Press', 'Decline Dumbbell Press', 'Close-Grip Push-Up', 'Feet-Elevated Push-Up', 'Single-Arm Cable Press', 'Hex Press'],
      primary: ['chest'], secondary: ['triceps', 'shoulders'], equipment: 'machine', category: 'compound',
      tips: 'Set shoulders down and back. Drive through a stable press path and control the negative.',
    },
    {
      names: ['Low-to-High Cable Fly', 'High-to-Low Cable Fly', 'Machine Fly', 'Svend Press', 'Landmine Press', 'Isometric Push-Up Hold', 'Ring Push-Up'],
      primary: ['chest'], secondary: ['shoulders'], equipment: 'cable', category: 'isolation',
      tips: 'Use controlled tempo and finish each rep with chest contraction, not shoulder shrugging.',
    },
    {
      names: ['Meadows Row', 'Chest-Supported Row', 'Single-Arm Cable Row', 'Inverted Row', 'Seal Row', 'Wide-Grip Pulldown', 'Neutral-Grip Pulldown'],
      primary: ['back', 'lats'], secondary: ['biceps', 'traps'], equipment: 'cable', category: 'compound',
      tips: 'Brace core and pull elbows through a full range. Pause briefly in the contracted position.',
    },
    {
      names: ['Reverse-Grip Pulldown', 'Assisted Pull-Up', 'Assisted Chin-Up', 'Band-Assisted Pull-Up', 'Scap Pull-Up', 'Prone Y Raise', 'Prone T Raise'],
      primary: ['lats', 'back'], secondary: ['biceps', 'shoulders'], equipment: 'bodyweight', category: 'compound',
      tips: 'Keep ribcage down and initiate from the shoulder blades before the elbow flexes.',
    },
    {
      names: ['Push Press', 'Z Press', 'Seated Barbell Press', 'Single-Arm Dumbbell Press', 'Landmine Shoulder Press', 'Bradford Press', 'Machine Lateral Raise'],
      primary: ['shoulders'], secondary: ['triceps', 'traps'], equipment: 'barbell', category: 'compound',
      tips: 'Stay stacked through torso and avoid overextending lower back while pressing overhead.',
    },
    {
      names: ['Cable Rear Delt Fly', 'Reverse Pec Deck', 'Plate Front Raise', 'Lean-Away Lateral Raise', 'Behind-the-Back Cable Raise', 'Face Pull External Rotation', 'Cuban Press'],
      primary: ['shoulders'], secondary: ['traps', 'back'], equipment: 'cable', category: 'isolation',
      tips: 'Lead with elbows and keep tension in delts; use momentum only to start stubborn reps.',
    },
    {
      names: ['Spider Curl', 'Bayesian Cable Curl', 'Cross-Body Hammer Curl', 'Reverse Curl', 'Machine Preacher Curl', 'Cable Rope Hammer Curl', 'Zottman Curl'],
      primary: ['biceps'], secondary: ['forearms'], equipment: 'dumbbell', category: 'isolation',
      tips: 'Keep elbows fixed and supinate strongly near top to maximize biceps recruitment.',
    },
    {
      names: ['JM Press', 'Bench Dip', 'Single-Arm Cable Pushdown', 'Reverse-Grip Pushdown', 'Overhead Cable Extension', 'Machine Dip', 'Rolling Dumbbell Extension'],
      primary: ['triceps'], secondary: ['chest', 'shoulders'], equipment: 'cable', category: 'isolation',
      tips: 'Control elbow position and fully extend through the triceps without shoulder roll-forward.',
    },
    {
      names: ['Pause Back Squat', 'Tempo Back Squat', 'Safety Bar Squat', 'Zercher Squat', 'Landmine Squat', 'Cyclist Squat', 'Heel-Elevated Goblet Squat'],
      primary: ['quads', 'glutes'], secondary: ['abs', 'lowBack'], equipment: 'barbell', category: 'compound',
      tips: 'Descend with braced core and balanced pressure across mid-foot before driving upward.',
    },
    {
      names: ['Leg Press Calf Raise', 'Single-Leg Press', 'Step-Up', 'Split Squat', 'Front-Foot Elevated Split Squat', 'Reverse Lunge', 'Smith Split Squat'],
      primary: ['quads', 'glutes'], secondary: ['hamstrings', 'calves'], equipment: 'machine', category: 'compound',
      tips: 'Track knees over toes and maintain controlled balance through each unilateral rep.',
    },
    {
      names: ['Nordic Curl', 'Single-Leg Romanian Deadlift', 'Banded Romanian Deadlift', 'Cable Romanian Deadlift', '45-Degree Back Extension', 'Reverse Hyperextension', 'Glute Ham Raise'],
      primary: ['hamstrings', 'glutes'], secondary: ['lowBack'], equipment: 'bodyweight', category: 'compound',
      tips: 'Hinge at hips with neutral spine and chase long hamstring tension before hip extension.',
    },
    {
      names: ['B-Stance Hip Thrust', 'Single-Leg Hip Thrust', 'Frog Pump', 'Cable Kickback', 'Machine Hip Abduction', 'Machine Hip Adduction', 'Banded Lateral Walk'],
      primary: ['glutes'], secondary: ['hamstrings', 'obliques'], equipment: 'band', category: 'isolation',
      tips: 'Hold peak contraction for one second and avoid lumbar extension at lockout.',
    },
    {
      names: ['Single-Leg Calf Raise', 'Smith Calf Raise', 'Leg Press Calf Press', 'Tibialis Raise', 'Bent-Knee Calf Raise', 'Calf Raise Pause Rep', 'Jump Rope Calf Hop'],
      primary: ['calves'], secondary: [], equipment: 'machine', category: 'isolation',
      tips: 'Use full ankle range with a pause in stretch and peak to train both gastroc and soleus.',
    },
    {
      names: ['Cable Pallof Press', 'Dead Bug', 'Hollow Body Hold', 'Stir-the-Pot', 'Weighted Plank', 'Dragon Flag Progression', 'V-Up'],
      primary: ['abs'], secondary: ['obliques', 'hipFlexors'], equipment: 'bodyweight', category: 'isolation',
      tips: 'Brace trunk as if preparing for impact and keep pelvis stable through each repetition.',
    },
    {
      names: ['Bicycle Crunch', 'Side Plank', 'Cable Side Bend', 'Hanging Knee Raise', 'Toes-to-Bar', 'Swiss Ball Crunch', 'Reverse Crunch'],
      primary: ['obliques', 'abs'], secondary: ['hipFlexors'], equipment: 'bodyweight', category: 'isolation',
      tips: 'Rotate through torso with intent and avoid pulling from neck or swinging hips.',
    },
    {
      names: ['Power Clean', 'Power Snatch', 'Hang Clean', 'Hang Snatch', 'Barbell High Pull', 'Kettlebell Clean', 'Kettlebell Snatch'],
      primary: ['quads', 'glutes', 'traps'], secondary: ['back', 'shoulders'], equipment: 'barbell', category: 'compound',
      tips: 'Explode through hips and finish tall. Catch under control with stable receiving position.',
    },
    {
      names: ['Ski Erg', 'Air Bike Sprint', 'Row Erg', 'Jump Squat', 'Medicine Ball Slam', 'Bear Crawl', 'Burpee Broad Jump'],
      primary: ['quads', 'shoulders', 'abs'], secondary: ['glutes', 'back'], equipment: 'other', category: 'compound',
      tips: 'Move fast with repeatable mechanics and keep breathing rhythm under fatigue.',
    },
    {
      names: ['Band Pull-Apart', 'External Rotation', 'Scap Push-Up', 'Wall Slide', 'Neck Flexion', 'Neck Extension', 'Forearm Pronation Supination'],
      primary: ['traps', 'shoulders'], secondary: ['forearms', 'back'], equipment: 'band', category: 'isolation',
      tips: 'Use strict control and smooth tempo to build joint resilience and movement quality.',
    },
  ];

  return specs.flatMap((spec) =>
    spec.names.map((name) => ({
      name: name,
      primary: spec.primary.slice(),
      secondary: spec.secondary.slice(),
      equipment: spec.equipment,
      category: spec.category,
      tips: spec.tips,
    }))
  );
}

function mergeExercises(exercises) {
  if (!Array.isArray(exercises) || !exercises.length) return;
  const known = new Set(EXERCISE_DB.map((exercise) => exercise.name.toLowerCase()));
  exercises.forEach((exercise) => {
    if (!exercise || !exercise.name) return;
    const key = exercise.name.toLowerCase();
    if (known.has(key)) return;
    EXERCISE_DB.push(exercise);
    known.add(key);
  });
}

mergeExercises(buildBundledExerciseExpansion());

function mapWgerEquipment(name) {
  const label = String(name || '').toLowerCase();
  if (label.includes('barbell') || label.includes('sz-bar')) return 'barbell';
  if (label.includes('dumbbell')) return 'dumbbell';
  if (label.includes('cable')) return 'cable';
  if (label.includes('machine')) return 'machine';
  if (label.includes('kettlebell')) return 'kettlebell';
  if (label.includes('smith')) return 'smith';
  if (label.includes('band') || label.includes('resistance')) return 'band';
  if (label.includes('bodyweight') || label.includes('none')) return 'bodyweight';
  return 'other';
}

function mapWgerMuscle(name) {
  const label = String(name || '').toLowerCase();
  if (label.includes('chest') || label.includes('pector')) return 'chest';
  if (label.includes('lat')) return 'lats';
  if (label.includes('back')) return 'back';
  if (label.includes('shoulder') || label.includes('deltoid')) return 'shoulders';
  if (label.includes('bicep')) return 'biceps';
  if (label.includes('tricep')) return 'triceps';
  if (label.includes('forearm')) return 'forearms';
  if (label.includes('quadr') || label.includes('thigh')) return 'quads';
  if (label.includes('hamstring')) return 'hamstrings';
  if (label.includes('glute')) return 'glutes';
  if (label.includes('calf')) return 'calves';
  if (label.includes('oblique')) return 'obliques';
  if (label.includes('abdom') || label.includes('core')) return 'abs';
  if (label.includes('trap')) return 'traps';
  if (label.includes('spine') || label.includes('erector') || label.includes('lower back')) return 'lowBack';
  if (label.includes('hip')) return 'hipFlexors';
  return null;
}

function toWgerExercise(raw) {
  if (!raw) return null;
  const name = String(raw.name || raw.original_name || '').trim();
  if (!name) return null;

  const primary = [];
  const secondary = [];
  const muscles = Array.isArray(raw.muscles) ? raw.muscles : [];
  const musclesSecondary = Array.isArray(raw.muscles_secondary) ? raw.muscles_secondary : [];
  muscles.forEach((m) => {
    const mapped = mapWgerMuscle(m && m.name_en ? m.name_en : m && m.name ? m.name : '');
    if (mapped && !primary.includes(mapped)) primary.push(mapped);
  });
  musclesSecondary.forEach((m) => {
    const mapped = mapWgerMuscle(m && m.name_en ? m.name_en : m && m.name ? m.name : '');
    if (mapped && !secondary.includes(mapped) && !primary.includes(mapped)) secondary.push(mapped);
  });

  if (!primary.length) {
    primary.push('back');
  }

  const equipmentRaw = Array.isArray(raw.equipment) && raw.equipment.length ? raw.equipment[0] : null;
  const equipment = mapWgerEquipment(equipmentRaw && (equipmentRaw.name_en || equipmentRaw.name));

  const description = String(raw.description || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const tips = description || 'Use controlled form and train with full range of motion.';

  return {
    name,
    primary,
    secondary,
    equipment,
    category: secondary.length ? 'compound' : 'isolation',
    tips,
  };
}

function saveExerciseCache(exercises) {
  try {
    localStorage.setItem(EXERCISE_CACHE_KEY, JSON.stringify({
      ts: Date.now(),
      items: exercises,
    }));
  } catch (_err) {
    // Ignore storage quota or privacy mode errors.
  }
}

function loadExerciseCache() {
  try {
    const raw = localStorage.getItem(EXERCISE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.items)) return null;
    if (Date.now() - Number(parsed.ts || 0) > EXERCISE_CACHE_TTL_MS) return null;
    return parsed.items;
  } catch (_err) {
    return null;
  }
}

async function fetchWgerExercises(limit) {
  const url = 'https://wger.de/api/v2/exerciseinfo/?limit=' + encodeURIComponent(String(limit || 120)) + '&language=2';
  const response = await fetch(url, { method: 'GET' });
  if (!response.ok) throw new Error('Wger request failed: ' + response.status);
  const payload = await response.json();
  const results = Array.isArray(payload && payload.results) ? payload.results : [];
  return results.map(toWgerExercise).filter(Boolean);
}

window.hydrateExerciseDatabase = async function () {
  const cached = loadExerciseCache();
  if (cached && cached.length) {
    mergeExercises(cached);
  }
  if (EXERCISE_DB.length >= TARGET_EXERCISE_COUNT) return;

  try {
    const needed = Math.max(120, TARGET_EXERCISE_COUNT - EXERCISE_DB.length + 40);
    const fetched = await fetchWgerExercises(needed);
    if (!fetched.length) return;
    mergeExercises(fetched);
    saveExerciseCache(fetched);
  } catch (_err) {
    // Keep bundled fallback only when offline or request fails.
  }
};

window.getExerciseDatabaseCount = function () {
  return EXERCISE_DB.length;
};

function createDefaultFormTips(exercise) {
  const tipsText = (exercise && exercise.tips) || '';
  const fragments = tipsText
    .split(/[.!?]\s+/)
    .map(s => s.trim())
    .filter(Boolean);

  const setup = {
    title: 'Setup',
    description: fragments[0] || 'Establish stance, grip, and alignment before your first rep.',
  };
  const execution = {
    title: 'Execution',
    description: fragments[1] || 'Move through full range with controlled tempo and stable bracing.',
  };
  const finish = {
    title: 'Finish',
    description:
      fragments[2] ||
      (exercise && exercise.category === 'isolation'
        ? 'Squeeze the target muscle at peak contraction, then return with control.'
        : 'Complete each rep with strong lockout and reset before the next rep.'),
  };

  return [setup, execution, finish];
}

// Ensure bundled JSON form tips are present for all exercises.
EXERCISE_DB.forEach((exercise) => {
  if (!Array.isArray(exercise.formTips) || !exercise.formTips.length) {
    exercise.formTips = createDefaultFormTips(exercise);
  }
});

// ========== SEARCH ==========
function searchExercises(query) {
  if (!query || query.trim().length < 1) return [];
  const q = query.toLowerCase().trim();
  const scored = EXERCISE_DB.map(ex => {
    const name = ex.name.toLowerCase();
    let score = 0;
    if (name === q) score = 1000;
    else if (name.startsWith(q)) score = 500;
    else if (name.includes(q)) score = 200;
    else {
      const words = q.split(/\s+/);
      const matches = words.filter(w => name.includes(w)).length;
      if (matches > 0) score = matches * 80;
      const muscleMatch = ex.primary.concat(ex.secondary || []).some(m => m.toLowerCase().includes(q));
      if (muscleMatch) score = Math.max(score, 100);
      const equipMatch = (ex.equipment || '').toLowerCase().includes(q);
      if (equipMatch) score = Math.max(score, 90);
    }
    return { ...ex, _score: score };
  }).filter(ex => ex._score > 0).sort((a, b) => b._score - a._score);
  return scored.slice(0, 12);
}

function getExercisesByMuscle(muscle) {
  const m = muscle.toLowerCase();
  return EXERCISE_DB.filter(ex =>
    ex.primary.some(p => p.toLowerCase() === m) ||
    (ex.secondary || []).some(s => s.toLowerCase() === m)
  );
}

function getExerciseInfo(name) {
  if (!name) return null;
  const n = name.toLowerCase().trim();
  const exact = EXERCISE_DB.find(ex => ex.name.toLowerCase() === n);
  if (exact) return exact;
  const partial = EXERCISE_DB.find(ex => ex.name.toLowerCase().includes(n) || n.includes(ex.name.toLowerCase()));
  return partial || null;
}

function getAllMuscleGroups() {
  return Object.entries(MUSCLE_GROUPS).map(([key, label]) => ({ key, label }));
}

// ========== AUTOCOMPLETE UI ==========
function createExerciseAutocomplete(inputId, rowIndex) {
  const input = $(inputId);
  if (!input) return;

  const wrap = input.parentElement;
  if (!wrap) return;
  wrap.style.position = 'relative';

  let dropdown = document.createElement('div');
  dropdown.className = 'exercise-autocomplete';
  dropdown.id = 'exac_' + rowIndex;
  wrap.appendChild(dropdown);

  input.addEventListener('input', () => {
    const q = input.value.trim();
    if (q.length < 1) { dropdown.classList.remove('show'); return; }
    const results = searchExercises(q);
    if (!results.length) { dropdown.classList.remove('show'); return; }

    dropdown.innerHTML = results.map((ex, i) =>
      '<div class="exercise-ac-item" data-ex-idx="' + i + '">' +
        '<div class="exercise-ac-main">' +
          '<div class="exercise-ac-name">' + esc(ex.name) + '</div>' +
          '<div class="exercise-ac-detail">' +
            ex.primary.map(m => MUSCLE_GROUPS[m] || m).join(', ') +
            ' • ' + (EQUIPMENT_TYPES[ex.equipment] || ex.equipment) +
          '</div>' +
        '</div>' +
        '<button class="btn btn-icon exercise-info-btn" data-ex-name="' + escAttr(ex.name) + '" aria-label="Exercise details" tabindex="-1">ℹ️</button>' +
      '</div>'
    ).join('');
    dropdown.classList.add('show');

    dropdown.querySelectorAll('.exercise-ac-item').forEach((item, idx) => {
      item.addEventListener('mousedown', (e) => {
        if (e.target.closest('.exercise-info-btn')) {
          e.preventDefault();
          e.stopPropagation();
          const btn = e.target.closest('.exercise-info-btn');
          const exName = btn.getAttribute('data-ex-name');
          if (typeof showExerciseDetailModal === 'function') {
            showExerciseDetailModal(exName);
          }
          return;
        }
        e.preventDefault();
        input.value = results[idx].name;
        dropdown.classList.remove('show');
        const nextField = $(('exsets_' + rowIndex));
        if (nextField) nextField.focus();
      });
    });
  });

  input.addEventListener('blur', () => {
    setTimeout(() => dropdown.classList.remove('show'), 200);
  });

  input.addEventListener('keydown', (e) => {
    if (!dropdown.classList.contains('show')) return;
    const items = dropdown.querySelectorAll('.exercise-ac-item');
    const active = dropdown.querySelector('.exercise-ac-item.active');
    let idx = active ? Array.from(items).indexOf(active) : -1;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (active) active.classList.remove('active');
      idx = Math.min(idx + 1, items.length - 1);
      items[idx].classList.add('active');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (active) active.classList.remove('active');
      idx = Math.max(idx - 1, 0);
      items[idx].classList.add('active');
    } else if (e.key === 'Enter' && active) {
      e.preventDefault();
      active.dispatchEvent(new Event('mousedown'));
    } else if (e.key === 'Escape') {
      dropdown.classList.remove('show');
    }
  });
}

function setExerciseNameForRow(rowIndex, exerciseName) {
  const nameInput = $('exname_' + rowIndex);
  if (!nameInput) return;
  nameInput.value = exerciseName;
  nameInput.dispatchEvent(new Event('change'));
  const setsInput = $('exsets_' + rowIndex);
  if (setsInput) setsInput.focus();
}

function getMuscleExerciseCounts() {
  const counts = {};
  getAllMuscleGroups().forEach((group) => {
    counts[group.key] = getExercisesByMuscle(group.key).length;
  });
  return counts;
}

window.showExerciseBrowserModal = function (rowIndex) {
  const modalRoot = $('modalContainer');
  if (!modalRoot) return;

  const counts = getMuscleExerciseCounts();
  const groups = getAllMuscleGroups();
  const defaultGroup = groups[0] ? groups[0].key : '';

  modalRoot.innerHTML = '' +
    '<div class="modal-overlay" id="exerciseBrowserOverlay">' +
      '<div class="modal exercise-browser-modal">' +
        '<div class="modal-title">' +
          '<span>Exercise Browser</span>' +
          '<button class="modal-close" id="exerciseBrowserClose" aria-label="Close">×</button>' +
        '</div>' +
        '<div class="text-xs mb-8 exercise-browser-hint">Pick a muscle group, then insert an exercise into the current row.</div>' +
        '<div class="exercise-browser-toolbar">' +
          '<input type="text" id="exerciseBrowserSearch" placeholder="Filter exercises..." aria-label="Filter exercises">' +
        '</div>' +
        '<div class="exercise-browser-groups" id="exerciseBrowserGroups">' +
          groups.map((group, idx) =>
            '<button class="exercise-group-chip' + (idx === 0 ? ' active' : '') + '" data-muscle-key="' + group.key + '">' +
              esc(group.label) + ' <span>' + (counts[group.key] || 0) + '</span>' +
            '</button>'
          ).join('') +
        '</div>' +
        '<div class="exercise-browser-list" id="exerciseBrowserList"></div>' +
      '</div>' +
    '</div>';

  const overlay = $('exerciseBrowserOverlay');
  const closeBtn = $('exerciseBrowserClose');
  const list = $('exerciseBrowserList');
  const searchInput = $('exerciseBrowserSearch');
  const groupWrap = $('exerciseBrowserGroups');

  let selectedMuscle = defaultGroup;
  let query = '';

  function renderList() {
    if (!list) return;
    const pool = selectedMuscle ? getExercisesByMuscle(selectedMuscle) : EXERCISE_DB.slice();
    const q = (query || '').trim().toLowerCase();
    const filtered = !q
      ? pool
      : pool.filter((exercise) => {
          const nameMatch = exercise.name.toLowerCase().includes(q);
          const primaryMatch = exercise.primary.some((m) => (MUSCLE_GROUPS[m] || m).toLowerCase().includes(q));
          const secondaryMatch = (exercise.secondary || []).some((m) => (MUSCLE_GROUPS[m] || m).toLowerCase().includes(q));
          const equip = (EQUIPMENT_TYPES[exercise.equipment] || exercise.equipment || '').toLowerCase();
          return nameMatch || primaryMatch || secondaryMatch || equip.includes(q);
        });

    if (!filtered.length) {
      list.innerHTML = '<div class="empty"><div class="empty-icon">🏋️</div><div class="empty-text">No exercises match this filter</div></div>';
      return;
    }

    list.innerHTML = filtered.map((exercise) => {
      const primary = (exercise.primary || []).map((m) => MUSCLE_GROUPS[m] || m).join(', ');
      const secondary = (exercise.secondary || []).map((m) => MUSCLE_GROUPS[m] || m).join(', ');
      const equip = EQUIPMENT_TYPES[exercise.equipment] || exercise.equipment || 'Other';
      return '' +
        '<div class="exercise-browser-item" data-exercise-name="' + escAttr(exercise.name) + '">' +
          '<div class="exercise-browser-item-main">' +
            '<div class="exercise-browser-item-name">' + esc(exercise.name) + '</div>' +
            '<div class="exercise-browser-item-meta">Primary: ' + esc(primary || 'N/A') + '</div>' +
            '<div class="exercise-browser-item-meta">Secondary: ' + esc(secondary || 'None') + ' • ' + esc(equip) + '</div>' +
          '</div>' +
          '<div class="exercise-browser-actions">' +
            '<button class="btn btn-outline btn-sm" data-exercise-info="' + escAttr(exercise.name) + '" type="button">Info</button>' +
            '<button class="btn btn-primary btn-sm" data-exercise-insert="' + escAttr(exercise.name) + '" type="button">Use</button>' +
          '</div>' +
        '</div>';
    }).join('');
  }

  function closeModalInternal() {
    if (typeof closeModal === 'function') {
      closeModal();
    } else if (modalRoot) {
      modalRoot.innerHTML = '';
    }
  }

  renderList();

  if (closeBtn) closeBtn.addEventListener('click', closeModalInternal);
  if (overlay) {
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) closeModalInternal();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      query = searchInput.value || '';
      renderList();
    });
  }

  if (groupWrap) {
    groupWrap.addEventListener('click', (event) => {
      const chip = event.target.closest('[data-muscle-key]');
      if (!chip) return;
      selectedMuscle = chip.getAttribute('data-muscle-key') || selectedMuscle;
      groupWrap.querySelectorAll('.exercise-group-chip').forEach((btn) => btn.classList.remove('active'));
      chip.classList.add('active');
      renderList();
    });
  }

  if (list) {
    list.addEventListener('click', (event) => {
      const infoBtn = event.target.closest('[data-exercise-info]');
      if (infoBtn) {
        const exName = infoBtn.getAttribute('data-exercise-info');
        if (exName && typeof showExerciseDetailModal === 'function') {
          showExerciseDetailModal(exName);
        }
        return;
      }

      const insertBtn = event.target.closest('[data-exercise-insert]');
      if (!insertBtn) return;
      const exName = insertBtn.getAttribute('data-exercise-insert');
      if (!exName) return;
      setExerciseNameForRow(rowIndex, exName);
      closeModalInternal();
    });
  }
};
