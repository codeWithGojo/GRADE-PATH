/* GradePath's data and calculations. These functions also run in the tests. */
(function (root) {
  "use strict";

  const letters = ["A", "B", "C", "D", "E", "F"];
  const gradeDefaults = {
    5: { A: 5, B: 4, C: 3, D: 2, E: 1, F: 0 },
    4: { A: 4, B: 3, C: 2, D: 1, E: 0, F: 0 }
  };
  const storageKey = "gradepath-v2";
  const exams = ["WAEC", "NECO", "JAMB"];
  const collator = new Intl.Collator(undefined, { sensitivity: "base" });

  function id() {
    return globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  function clean(value, length = 120) {
    return typeof value === "string" ? value.trim().slice(0, length) : "";
  }

  function courseCode(value) {
    return clean(value, 24).toUpperCase().replace(/\s+/g, "");
  }

  function localDay(value = new Date()) {
    const date = new Date(value);
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
  }

  function shiftDay(days, start = localDay()) {
    const date = new Date(start + "T12:00:00");
    date.setDate(date.getDate() + days);
    return localDay(date);
  }

  function weekStart(day = localDay()) {
    const weekday = new Date(day + "T12:00:00").getDay();
    return shiftDay(-((weekday + 6) % 7), day);
  }

  function daysBetween(from, to) {
    return Math.round((Date.parse(to + "T00:00:00Z") - Date.parse(from + "T00:00:00Z")) / 86_400_000);
  }

  function dateText(date) {
    if (!date) return "";
    return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" }).format(new Date(date + "T12:00:00"));
  }

  function validDate(value) {
    return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
      && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  }

  function validLink(value) {
    try {
      const url = new URL(value);
      return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : "";
    } catch {
      return "";
    }
  }

  function blankState() {
    return {
      version: 3, mode: "university", schoolClass: "SS 3", schoolTarget: 75, schoolTerms: [],
      scale: 5, points: { ...gradeDefaults[5] }, replace: false, semesters: [],
      profiles: [], materials: [], notes: [], tasks: [], questions: [], attempts: [], mistakes: [],
      labDrafts: {}, labPassed: [], assessment: null, exams: {}, selectedExam: "WAEC"
    };
  }

  function shortList(value, limit) {
    return Array.isArray(value) ? value.slice(0, limit) : [];
  }

  function courseRecord(course) {
    const units = Number(course?.units);
    if (!Number.isInteger(units) || units < 1 || units > 60 || !letters.includes(course?.grade)) return null;
    return { code: courseCode(course.code), subject: clean(course.subject, 40), units, grade: course.grade };
  }

  function questionRecord(question) {
    const options = shortList(question?.options, 4).map(option => clean(option, 220));
    const prompt = clean(question?.prompt, 420);
    if (!prompt || options.length !== 4 || options.some(option => !option)
      || !Number.isInteger(question.answer) || question.answer < 0 || question.answer > 3) return null;
    return {
      id: clean(question.id, 90) || id(), course: courseCode(question.course),
      topic: clean(question.topic, 60) || "General", prompt, options, answer: question.answer,
      exams: shortList(question.exams, 3).filter(exam => exams.includes(exam)), subject: clean(question.subject, 55),
      explanation: clean(question.explanation, 550) || "Review this topic and try the question again."
    };
  }

  // Supports both the previous single-file calculator and this edition's backup format.
  function normalizeState(source) {
    if (!source || typeof source !== "object" || ![4, 5].includes(source.scale) || !Array.isArray(source.semesters)) {
      throw new Error("Choose a valid GradePath backup file.");
    }
    const state = blankState();
    state.mode = source.mode === "secondary" ? "secondary" : "university";
    state.schoolClass = ["JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3"].includes(source.schoolClass) ? source.schoolClass : "SS 3";
    state.schoolTarget = Number.isFinite(source.schoolTarget) && source.schoolTarget >= 0 && source.schoolTarget <= 100 ? source.schoolTarget : 75;
    state.schoolTerms = shortList(source.schoolTerms, 30).map(term => ({
      id: clean(term?.id, 90) || id(), name: clean(term?.name, 60),
      subjects: schoolSubjects(term?.subjects)
    })).filter(term => term.name && term.subjects.length);
    state.scale = source.scale;
    state.replace = source.replace === true;
    state.points = Object.fromEntries(letters.map(letter => {
      const points = source.points?.[letter];
      return [letter, typeof points === "number" && Number.isFinite(points) && points >= 0 && points <= state.scale
        ? points : gradeDefaults[state.scale][letter]];
    }));
    state.semesters = shortList(source.semesters, 100).map(semester => ({
      id: clean(semester?.id, 90) || id(), name: clean(semester?.name, 60),
      courses: shortList(semester?.courses, 60).map(courseRecord).filter(Boolean)
    })).filter(term => term.name && term.courses.length);
    state.profiles = shortList(source.profiles, 150).map(profile => ({
      code: courseCode(profile?.code), name: clean(profile?.name, 80), topic: clean(profile?.topic, 60),
      date: validDate(profile?.date) ? profile.date : "", confidence: Math.max(1, Math.min(5, Number(profile?.confidence) || 3))
    })).filter(profile => profile.code);
    state.materials = shortList(source.materials, 200).map(item => ({
      id: clean(item?.id, 90) || id(), title: clean(item?.title, 100), course: courseCode(item?.course),
      topic: clean(item?.topic, 60), url: validLink(item?.url)
    })).filter(item => item.title && item.url);
    state.notes = shortList(source.notes, 15).map(note => ({
      id: clean(note?.id, 90) || id(), title: clean(note?.title, 100), course: courseCode(note?.course),
      kind: note?.kind === "pdf" ? "pdf" : "text",
      pages: shortList(note?.pages, 30).map(page => ({
        number: Number.isInteger(page?.number) && page.number > 0 ? page.number : 1,
        text: clean(page?.text, 6500)
      })).filter(page => page.text)
    })).filter(note => note.title && note.pages.length);
    state.tasks = shortList(source.tasks, 400).map(task => ({
      id: clean(task?.id, 90) || id(), title: clean(task?.title, 120), course: courseCode(task?.course),
      date: validDate(task?.date) ? task.date : localDay(),
      minutes: Number.isInteger(task?.minutes) && task.minutes >= 5 && task.minutes <= 300 ? task.minutes : 25,
      completed: validDate(task?.completed) ? task.completed : ""
    })).filter(task => task.title);
    state.questions = shortList(source.questions, 180).map(questionRecord).filter(Boolean);
    state.attempts = shortList(source.attempts, 150).map(attempt => ({
      date: validDate(attempt?.date) ? attempt.date : localDay(),
      correct: Math.max(0, Math.min(180, Number(attempt?.correct) || 0)),
      total: Math.max(1, Math.min(180, Number(attempt?.total) || 1)),
      topic: clean(attempt?.topic, 60), course: courseCode(attempt?.course),
      exam: exams.includes(attempt?.exam) ? attempt.exam : "", subject: clean(attempt?.subject, 55)
    }));
    state.mistakes = shortList(source.mistakes, 220).map(item => ({
      id: clean(item?.id, 90), due: validDate(item?.due) ? item.due : localDay(),
      streak: Math.max(0, Math.min(4, Number(item?.streak) || 0))
    })).filter(item => item.id);
    state.labDrafts = Object.fromEntries(["html-form", "weighted-gpa", "revision-list"].flatMap(lesson => {
      const code = source.labDrafts?.[lesson];
      return typeof code === "string" ? [[lesson, code.slice(0, 12_000)]] : [];
    }));
    state.labPassed = shortList(source.labPassed, 3).filter(lesson => ["html-form", "weighted-gpa", "revision-list"].includes(lesson));
    if (source.assessment && typeof source.assessment === "object") {
      const { coursework, weight, target } = source.assessment;
      if ([coursework, weight, target].every(value => typeof value === "number" && value >= 0 && value <= 100) && weight < 100) {
        state.assessment = { coursework, weight, target };
      }
    }
    state.selectedExam = exams.includes(source.selectedExam) ? source.selectedExam : "WAEC";
    for (const exam of exams) {
      if (source.exams?.[exam]) state.exams[exam] = normalizeExam(exam, source.exams[exam]);
    }
    return state;
  }

  function normalizeExam(exam, input) {
    const seen = new Set();
    const subjects = shortList(input.subjects, exam === "JAMB" ? 4 : 12).flatMap(subject => {
      const name = clean(subject?.name, 55);
      const key = name.toLowerCase();
      if (!name || seen.has(key)) return [];
      seen.add(key);
      return [{
        name, topic: clean(subject.topic, 60),
        score: Number.isInteger(subject.score) && subject.score >= 0 && subject.score <= 100 ? subject.score : null,
        confidence: Math.max(1, Math.min(5, Number(subject.confidence) || 3))
      }];
    });
    const maximum = exam === "JAMB" ? 400 : 100;
    return {
      date: validDate(input.date) ? input.date : "",
      target: Number.isInteger(input.target) && input.target >= 0 && input.target <= maximum ? input.target : null,
      subjects
    };
  }

  function schoolSubjects(input) {
    const seen = new Set();
    return shortList(input, 20).flatMap(subject => {
      const name = clean(subject?.name, 55);
      const key = name.toLocaleLowerCase();
      if (!name || seen.has(key) || typeof subject.score !== "number" || !Number.isFinite(subject.score) || subject.score < 0 || subject.score > 100) return [];
      seen.add(key);
      return [{ name, score: subject.score }];
    });
  }

  function schoolSummary(terms) {
    const latest = terms.at(-1);
    const previous = terms.at(-2);
    const mean = term => term?.subjects.length ? term.subjects.reduce((sum, subject) => sum + subject.score, 0) / term.subjects.length : null;
    const average = mean(latest);
    const before = mean(previous);
    return { average, change: average === null || before === null ? null : average - before,
      subjects: [...(latest?.subjects || [])].sort((a, b) => b.score - a.score),
      history: terms.map(term => ({ id: term.id, name: term.name, average: mean(term) })) };
  }

  function examInsights(plan, exam) {
    const marks = plan.subjects.filter(subject => subject.score !== null);
    const total = marks.reduce((sum, subject) => sum + subject.score, 0);
    const mean = marks.length ? total / marks.length : null;
    const fullMock = exam === "JAMB" && plan.subjects.length === 4 && marks.length === 4;
    const order = [...plan.subjects].sort((a, b) => (a.score ?? a.confidence * 20) - (b.score ?? b.confidence * 20));
    return { total, mean, fullMock, marks, order };
  }

  function summarize(courses, points) {
    let units = 0;
    let gradePoints = 0;
    for (const course of courses) {
      units += course.units;
      gradePoints += course.units * points[course.grade];
    }
    return { units, gradePoints, gpa: units ? gradePoints / units : null };
  }

  function eligibleCourses(terms, replace) {
    const courses = terms.flatMap(term => term.courses);
    if (!replace) return courses;

    const latest = new Map();
    const uncoded = [];
    for (const course of courses) {
      if (course.code) latest.set(course.code, course);
      else uncoded.push(course);
    }
    return uncoded.concat([...latest.values()]);
  }

  function timeline(state) {
    return state.semesters.map((term, i) => ({
      name: term.name, id: term.id, semester: summarize(term.courses, state.points),
      cumulative: summarize(eligibleCourses(state.semesters.slice(0, i + 1), state.replace), state.points)
    }));
  }

  function overall(state) {
    return summarize(eligibleCourses(state.semesters, state.replace), state.points);
  }

  function subjectInsights(state) {
    const groups = new Map();
    for (const course of eligibleCourses(state.semesters, state.replace)) {
      if (!course.subject) continue;
      const key = course.subject.toLocaleLowerCase();
      if (!groups.has(key)) groups.set(key, { subject: course.subject, courses: [] });
      groups.get(key).courses.push(course);
    }
    return [...groups.values()].map(group => {
      const included = new Set(group.courses);
      const termGpas = state.semesters.map(term => summarize(term.courses.filter(course => included.has(course)), state.points).gpa)
        .filter(gpa => gpa !== null);
      const grades = {};
      for (const course of group.courses) grades[course.grade] = (grades[course.grade] ?? 0) + 1;
      return { subject: group.subject, grades, termGpas, count: group.courses.length, ...summarize(group.courses, state.points) };
    }).sort((a, b) => b.gpa - a.gpa || collator.compare(a.subject, b.subject));
  }

  function forecast(current, futureUnits, target, futureGpa, maxGrade, minGrade = 0) {
    if (!current.units || !Number.isInteger(futureUnits) || futureUnits < 1) return null;
    const total = current.units + futureUnits;
    return {
      required: (target * total - current.gradePoints) / futureUnits,
      highest: (current.gradePoints + futureUnits * maxGrade) / total,
      projected: (current.gradePoints + futureUnits * futureGpa) / total,
      lowest: (current.gradePoints + futureUnits * minGrade) / total
    };
  }

  function assessmentScore(coursework, weight, target) {
    const fraction = weight / 100;
    return (target - coursework * fraction) / (1 - fraction);
  }

  function priorityList(state, today = localDay()) {
    return state.profiles.map(profile => {
      const days = profile.date ? daysBetween(today, profile.date) : Infinity;
      const dueSoon = days >= 0 && days <= 7;
      const last = state.attempts.find(attempt => attempt.course === profile.code);
      const lowPractice = last && last.correct / last.total < 0.6;
      const score = (dueSoon ? 13 - days : 0) + (5 - profile.confidence) * 2 + (lowPractice ? 3 : 0);
      const reasons = [];
      if (dueSoon) reasons.push(days === 0 ? "Assessment today" : "Assessment in " + days + (days === 1 ? " day" : " days"));
      if (profile.confidence <= 3) reasons.push("Confidence " + profile.confidence + "/5");
      if (lowPractice) reasons.push("Last quiz " + last.correct + "/" + last.total);
      return { ...profile, score, reasons };
    }).filter(item => item.reasons.length > 0).sort((a, b) => b.score - a.score || collator.compare(a.code, b.code));
  }

  function recordReview(state, questionId, correct, today = localDay()) {
    const item = state.mistakes.find(mistake => mistake.id === questionId);
    if (!correct) {
      if (item) {
        item.streak = 0;
        item.due = shiftDay(2, today);
      } else {
        state.mistakes.push({ id: questionId, streak: 0, due: shiftDay(2, today) });
      }
    } else if (item) {
      item.streak += 1;
      if (item.streak >= 3) state.mistakes = state.mistakes.filter(mistake => mistake !== item);
      else item.due = shiftDay(2 ** (item.streak + 1), today);
    }
  }

  const core = {
    letters, gradeDefaults, storageKey, exams, id, clean, courseCode, localDay, shiftDay, weekStart,
    daysBetween, dateText, validDate, validLink, blankState, normalizeState, courseRecord, questionRecord,
    summarize, eligibleCourses, timeline, overall, subjectInsights, forecast, assessmentScore, priorityList, recordReview, normalizeExam, examInsights, schoolSubjects, schoolSummary
  };

  if (typeof module !== "undefined" && module.exports) module.exports = core;
  else root.GradePathCore = core;
})(globalThis);
