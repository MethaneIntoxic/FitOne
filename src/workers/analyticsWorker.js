// FitOne analytics worker
// Offloads range aggregations so analytics UI remains responsive.

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function inRange(dateStr, startDate, endDate) {
  if (!dateStr) return false;
  return String(dateStr) >= String(startDate) && String(dateStr) <= String(endDate);
}

function computeReportCard(payload) {
  const source = payload || {};
  const startDate = String(source.startDate || "");
  const endDate = String(source.endDate || startDate);
  const dayCount = Math.max(1, Number(source.dayCount) || 1);
  const proteinGoal = Math.max(1, Number(source.proteinGoal) || 150);

  const foods = safeArray(source.food).filter(function (row) {
    return row && inRange(row.date, startDate, endDate);
  });

  const workouts = safeArray(source.workouts).filter(function (row) {
    return row && inRange(row.date, startDate, endDate);
  });

  const bodyRows = safeArray(source.body)
    .filter(function (row) {
      return row && inRange(row.date, startDate, endDate) && Number(row.weight) > 0;
    })
    .sort(function (a, b) {
      return String(a.date || "").localeCompare(String(b.date || ""));
    });

  const totals = foods.reduce(
    function (acc, row) {
      acc.calories += Number(row.calories) || 0;
      acc.protein += Number(row.protein) || 0;
      acc.carbs += Number(row.carbs) || 0;
      acc.fat += Number(row.fat) || 0;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const workoutMinutes = workouts.reduce(function (sum, row) {
    return sum + (Number(row.duration) || 0);
  }, 0);

  const proteinByDay = Object.create(null);
  foods.forEach(function (row) {
    if (!row || !row.date) return;
    proteinByDay[row.date] = (Number(proteinByDay[row.date]) || 0) + (Number(row.protein) || 0);
  });

  const proteinGoalDays = Object.keys(proteinByDay).filter(function (dateKey) {
    return Number(proteinByDay[dateKey]) >= proteinGoal;
  }).length;

  const workoutDays = new Set(
    workouts
      .map(function (row) {
        return row && row.date ? row.date : "";
      })
      .filter(Boolean)
  ).size;

  const firstWeight = bodyRows.length ? Number(bodyRows[0].weight) || 0 : 0;
  const latestWeight = bodyRows.length ? Number(bodyRows[bodyRows.length - 1].weight) || 0 : 0;

  return {
    startDate: startDate,
    endDate: endDate,
    dayCount: dayCount,
    caloriesTotal: totals.calories,
    caloriesAvg: totals.calories / dayCount,
    proteinAvg: totals.protein / dayCount,
    carbsAvg: totals.carbs / dayCount,
    fatAvg: totals.fat / dayCount,
    workoutCount: workouts.length,
    workoutDays: workoutDays,
    workoutMinutes: workoutMinutes,
    proteinGoal: proteinGoal,
    proteinGoalDays: proteinGoalDays,
    weightStart: firstWeight,
    weightLatest: latestWeight,
    weightDelta: latestWeight && firstWeight ? latestWeight - firstWeight : 0,
  };
}

self.addEventListener("message", function (event) {
  const data = event && event.data ? event.data : {};
  const id = Number(data.id) || 0;
  const task = String(data.task || "");
  const payload = data.payload || {};

  let result = null;
  if (task === "reportCard") {
    result = computeReportCard(payload);
  }

  self.postMessage({ id: id, payload: result });
});
