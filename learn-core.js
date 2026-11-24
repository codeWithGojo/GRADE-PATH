/* Deterministic formula solvers for the Formula library.
   Pure functions only: no DOM, no network, no language model. Tested in test/learn.test.mjs. */
(function (root) {
  "use strict";

  const finite = value => typeof value === "number" && Number.isFinite(value);

  /* Each solver receives known values in SI units and returns
     { value, unit, steps[] } or { error }. Steps are plain strings shown to the learner. */
  function need(values, names) {
    const missing = names.filter(name => !finite(values[name]));
    return missing.length ? { error: "Enter " + missing.join(", ") + "." } : null;
  }
  function nonZero(values, names) {
    const zero = names.filter(name => values[name] === 0);
    return zero.length ? { error: zero.join(", ") + " cannot be zero here (it is a divisor)." } : null;
  }
  function positive(values, names) {
    const bad = names.filter(name => values[name] <= 0);
    return bad.length ? { error: bad.join(", ") + " must be greater than zero." } : null;
  }

  /* Rounds for display without hiding magnitude: 4 significant figures. */
  function format(value) {
    if (!finite(value)) return "—";
    if (value === 0) return "0";
    const magnitude = Math.abs(value);
    if (magnitude >= 1e6 || magnitude < 1e-3) return value.toExponential(3).replace("e+", " × 10^").replace("e-", " × 10^-");
    return String(Number(value.toPrecision(4)));
  }

  /* Product relation a = b × c (V = IR, F = ma, ...). Solve for any one symbol. */
  function product(target, [a, b, c], units, values) {
    if (target === a) {
      const check = need(values, [b, c]); if (check) return check;
      const result = values[b] * values[c];
      return { value: result, unit: units[a], steps: [a + " = " + b + " × " + c, a + " = " + format(values[b]) + " × " + format(values[c]), a + " = " + format(result) + " " + units[a]] };
    }
    const other = target === b ? c : b;
    const check = need(values, [a, other]) || nonZero(values, [other]); if (check) return check;
    const result = values[a] / values[other];
    return { value: result, unit: units[target], steps: [target + " = " + a + " ÷ " + other, target + " = " + format(values[a]) + " ÷ " + format(values[other]), target + " = " + format(result) + " " + units[target]] };
  }

  /* Quotient relation a = b ÷ c (p = F/A, ρ = m/V). */
  function quotient(target, [a, b, c], units, values) {
    if (target === a) {
      const check = need(values, [b, c]) || nonZero(values, [c]); if (check) return check;
      const result = values[b] / values[c];
      return { value: result, unit: units[a], steps: [a + " = " + b + " ÷ " + c, a + " = " + format(values[b]) + " ÷ " + format(values[c]), a + " = " + format(result) + " " + units[a]] };
    }
    if (target === b) {
      const check = need(values, [a, c]); if (check) return check;
      const result = values[a] * values[c];
      return { value: result, unit: units[b], steps: [b + " = " + a + " × " + c, b + " = " + format(values[a]) + " × " + format(values[c]), b + " = " + format(result) + " " + units[b]] };
    }
    const check = need(values, [a, b]) || nonZero(values, [a]); if (check) return check;
    const result = values[b] / values[a];
    return { value: result, unit: units[c], steps: [c + " = " + b + " ÷ " + a, c + " = " + format(values[b]) + " ÷ " + format(values[a]), c + " = " + format(result) + " " + units[c]] };
  }

  const solvers = {
    "ohms-law": (target, v) => product(target, ["V", "I", "R"], { V: "V", I: "A", R: "Ω" }, v),
    "newton-second": (target, v) => product(target, ["F", "m", "a"], { F: "N", m: "kg", a: "m/s²" }, v),
    "pressure": (target, v) => quotient(target, ["p", "F", "A"], { p: "Pa", F: "N", A: "m²" }, v),
    "density": (target, v) => quotient(target, ["ρ", "m", "V"], { "ρ": "kg/m³", m: "kg", V: "m³" }, v),
    "motion-first": (target, v) => {
      const units = { v: "m/s", u: "m/s", a: "m/s²", t: "s" };
      const formulas = {
        v: [["u", "a", "t"], x => x.u + x.a * x.t, x => ["v = u + a t", "v = " + format(x.u) + " + " + format(x.a) + " × " + format(x.t)]],
        u: [["v", "a", "t"], x => x.v - x.a * x.t, x => ["u = v − a t", "u = " + format(x.v) + " − " + format(x.a) + " × " + format(x.t)]],
        a: [["v", "u", "t"], x => (x.v - x.u) / x.t, x => ["a = (v − u) ÷ t", "a = (" + format(x.v) + " − " + format(x.u) + ") ÷ " + format(x.t)]],
        t: [["v", "u", "a"], x => (x.v - x.u) / x.a, x => ["t = (v − u) ÷ a", "t = (" + format(x.v) + " − " + format(x.u) + ") ÷ " + format(x.a)]]
      };
      const [inputs, solve, describe] = formulas[target] || [];
      if (!inputs) return { error: "Choose a quantity to solve for." };
      const check = need(v, inputs) || (target === "a" ? nonZero(v, ["t"]) : target === "t" ? nonZero(v, ["a"]) : null); if (check) return check;
      const result = solve(v);
      if (target === "t" && result < 0) return { error: "These values give a negative time. Check the signs of u, v and a." };
      return { value: result, unit: units[target], steps: [...describe(v), target + " = " + format(result) + " " + units[target]] };
    },
    "axial-stress": (target, v) => {
      const check = need(v, ["F", "A", "ΔL", "L₀"]) || positive(v, ["A", "L₀"]) || nonZero(v, ["ΔL"]); if (check) return check;
      const stress = v.F / v.A, strain = v["ΔL"] / v["L₀"], modulus = stress / strain;
      const results = { "σ": [stress, "Pa"], "ε": [strain, "(no unit)"], "E": [modulus, "Pa"] };
      if (!results[target]) return { error: "Choose σ, ε or E." };
      return { value: results[target][0], unit: results[target][1], steps: [
        "σ = F ÷ A = " + format(v.F) + " ÷ " + format(v.A) + " = " + format(stress) + " Pa (" + format(stress / 1e6) + " MPa)",
        "ε = ΔL ÷ L₀ = " + format(v["ΔL"]) + " ÷ " + format(v["L₀"]) + " = " + format(strain),
        "E = σ ÷ ε = " + format(stress) + " ÷ " + format(strain) + " = " + format(modulus) + " Pa (" + format(modulus / 1e9) + " GPa)"
      ] };
    },
    "flexure": (target, v) => {
      const units = { "σ": "Pa", M: "N·m", y: "m", I: "m⁴" };
      if (target === "σ") {
        const check = need(v, ["M", "y", "I"]) || positive(v, ["I"]); if (check) return check;
        const result = v.M * v.y / v.I;
        return { value: result, unit: "Pa", steps: ["σ = M y ÷ I", "σ = " + format(v.M) + " × " + format(v.y) + " ÷ " + format(v.I), "σ = " + format(result) + " Pa (" + format(result / 1e6) + " MPa)"] };
      }
      if (target === "M") {
        const check = need(v, ["σ", "y", "I"]) || nonZero(v, ["y"]) || positive(v, ["I"]); if (check) return check;
        const result = v["σ"] * v.I / v.y;
        return { value: result, unit: units.M, steps: ["M = σ I ÷ y", "M = " + format(v["σ"]) + " × " + format(v.I) + " ÷ " + format(v.y), "M = " + format(result) + " N·m"] };
      }
      return { error: "Choose σ or M." };
    },
    "continuity": (target, v) => {
      const names = ["A₁", "v₁", "A₂", "v₂"];
      if (!names.includes(target)) return { error: "Choose a quantity to solve for." };
      const others = names.filter(name => name !== target);
      const check = need(v, others); if (check) return check;
      const pair = { "A₁": "v₁", "v₁": "A₁", "A₂": "v₂", "v₂": "A₂" };
      const side = target.endsWith("₁") ? ["A₂", "v₂"] : ["A₁", "v₁"];
      const divisor = pair[target];
      const zero = nonZero(v, [divisor]); if (zero) return zero;
      const flow = v[side[0]] * v[side[1]];
      const result = flow / v[divisor];
      const unit = target.startsWith("A") ? "m²" : "m/s";
      return { value: result, unit, steps: [
        "Q = " + side[0] + " " + side[1] + " = " + format(v[side[0]]) + " × " + format(v[side[1]]) + " = " + format(flow) + " m³/s",
        target + " = Q ÷ " + divisor + " = " + format(flow) + " ÷ " + format(v[divisor]),
        target + " = " + format(result) + " " + unit
      ] };
    }
  };

  function solve(topicId, target, values) {
    const solver = solvers[topicId];
    if (!solver) return { error: "No calculator for this topic yet." };
    const clean = {};
    for (const [key, value] of Object.entries(values || {})) clean[key] = typeof value === "number" ? value : Number.NaN;
    return solver(target, clean);
  }

  /* Which known values a learner must enter to solve for `target`. */
  function inputsFor(topicId, target, solveFor) {
    if (topicId === "axial-stress") return ["F", "A", "ΔL", "L₀"];
    if (topicId === "flexure") return target === "M" ? ["σ", "y", "I"] : ["M", "y", "I"];
    return solveFor.filter(symbol => symbol !== target);
  }

  root.GradePathLearnCore = { solve, format, inputsFor, solvers: Object.keys(solvers) };
})(typeof window === "undefined" ? globalThis : window);
