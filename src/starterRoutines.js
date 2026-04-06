// ========== STARTER ROUTINES ==========
// Bundled performance protocols for the Kinetic Obsidian Workout Library (W4.6)
// These are zero-cost, offline-first routine definitions.

const STARTER_ROUTINES = [
  {
    id: 'starter_hyper_strength_v1',
    name: 'HyperStrength V1',
    description: 'A high-intensity full body protocol focusing on maximal recruitment and neural drive.',
    level: 'Advanced',
    category: 'STRENGTH',
    duration: 75,
    isStarter: true,
    exercises: [
      { name: 'Barbell Squat', sets: 4, reps: 5, weight: 100 },
      { name: 'Barbell Bench Press', sets: 4, reps: 5, weight: 80 },
      { name: 'Barbell Row', sets: 4, reps: 8, weight: 70 },
      { name: 'Overhead Press', sets: 3, reps: 8, weight: 50 },
      { name: 'Deadlift', sets: 1, reps: 5, weight: 140 }
    ]
  },
  {
    id: 'starter_kinetic_cardio',
    name: 'Kinetic Cardio',
    description: 'High-velocity metabolic conditioning designed to maximize caloric burn and VO2 max.',
    level: 'Intermediate',
    category: 'HIIT',
    duration: 30,
    isStarter: true,
    exercises: [
      { name: 'Burpee', sets: 4, reps: 15, weight: 0 },
      { name: 'Kettlebell Swing', sets: 4, reps: 20, weight: 16 },
      { name: 'Mountain Climber', sets: 4, reps: 30, weight: 0 },
      { name: 'Box Jump', sets: 4, reps: 10, weight: 0 }
    ]
  },
  {
    id: 'starter_axial_core',
    name: 'Axial Core',
    description: 'Foundation-level stability protocol focusing on spinal alignment and anti-rotational strength.',
    level: 'Beginner',
    category: 'STABILITY',
    duration: 25,
    isStarter: true,
    exercises: [
      { name: 'Plank', sets: 3, reps: 1, weight: 60 }, // reps used as seconds here for simplicity
      { name: 'Dead Bug', sets: 3, reps: 12, weight: 0 },
      { name: 'Bird Dog', sets: 3, reps: 12, weight: 0 },
      { name: 'Hanging Leg Raise', sets: 3, reps: 10, weight: 0 }
    ]
  },
  {
    id: 'starter_titan_lower',
    name: 'Titan Lower',
    description: 'Lower extremity dominant power protocol for explosive vertical and posterior chain development.',
    level: 'Elite',
    category: 'POWER',
    duration: 60,
    isStarter: true,
    exercises: [
      { name: 'Front Squat', sets: 5, reps: 3, weight: 90 },
      { name: 'Romanian Deadlift', sets: 4, reps: 8, weight: 110 },
      { name: 'Bulgarian Split Squat', sets: 3, reps: 10, weight: 20 },
      { name: 'Leg Press', sets: 3, reps: 12, weight: 200 }
    ]
  },
  {
    id: 'starter_neural_flow',
    name: 'Neural Flow',
    description: 'Active recovery and mobility session to enhance CNS recovery and joint health.',
    level: 'Any',
    category: 'RECOVERY',
    duration: 20,
    isStarter: true,
    exercises: [
      { name: 'Face Pull', sets: 3, reps: 15, weight: 15 },
      { name: 'Goblet Squat', sets: 2, reps: 15, weight: 12 },
      { name: 'Lat Pulldown', sets: 2, reps: 15, weight: 40 },
      { name: 'Push-Up', sets: 2, reps: 15, weight: 0 }
    ]
  }
];

if (typeof window !== 'undefined') {
  window.STARTER_ROUTINES = STARTER_ROUTINES;
}
