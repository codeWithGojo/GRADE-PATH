/* Edit this file to add resources, original practice questions, or coding lessons. */
window.GradePathCatalog = {
  resources: [
    ["MDN · Structuring content with HTML", "Web development", "HTML", "Lessons and examples on forms, links, and semantic HTML.", "https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Structuring_content"],
    ["MDN · Dynamic scripting with JavaScript", "Web development", "JavaScript", "Work through variables, functions, events, and DOM exercises.", "https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting"],
    ["CS50P · Introduction to Python", "Programming", "Python", "Lectures and problem sets on functions, loops, exceptions, and testing.", "https://cs50.harvard.edu/python/"],
    ["Operating Systems: Three Easy Pieces", "Operating systems", "CPU scheduling", "Free textbook chapters on scheduling, memory, and concurrency.", "https://pages.cs.wisc.edu/~remzi/OSTEP/"],
    ["OpenStax · Introductory Statistics 2e", "Maths", "Probability", "An open textbook with worked examples and practice problems.", "https://openstax.org/details/books/introductory-statistics-2e"],
    ["SQLBolt · Interactive SQL lessons", "Databases", "SQL queries", "Practise SELECT, filtering, joins, and aggregates in your browser.", "https://sqlbolt.com/"]
  ],
  questions: [
    ["html-label", "Web development", "What connects a visible label to a form input?", ["The label's for attribute matches the input's id", "Their classes match", "Their text is identical", "They are in separate forms"], 0, "Use a matching for and id, or wrap the input inside its label."],
    ["html-button", "Web development", "Which button type adds a new row without submitting the form?", ["submit", "button", "reset", "text"], 1, "A button with type='button' waits for its click handler."],
    ["html-form", "Web development", "Which input attribute prevents a blank submission through native form validation?", ["alt", "title", "required", "placeholder"], 2, "The required attribute makes the browser ask for a value before submitting."],
    ["js-weighted", "Programming", "An A is 5 points and a B is 4. What is the GPA for a 3-unit A and a 2-unit B?", ["4.50", "4.60", "4.80", "5.00"], 1, "Multiply grades by their units, then divide by total units. (15 + 8) ÷ 5 = 4.60."],
    ["js-loop", "Programming", "Which method returns an array containing only items that pass a test?", ["filter", "map", "join", "push"], 0, "filter runs a test for each item and keeps the items that pass."],
    ["js-number", "Programming", "A form input's value is the string '3'. Which expression gives the number 5?", ["value + 2", "Number(value) + 2", "String(value) + 2", "value + '2'"], 1, "Number converts a numeric string before you add. Otherwise + can join strings."],
    ["os-round-robin", "Operating systems", "What does a time quantum control in Round Robin?", ["The number of CPU cores", "How long a ready process can run before yielding", "How much disk a process can use", "How many processes may be created"], 1, "A process gets up to one quantum, then an unfinished process goes to the back of the ready queue."],
    ["os-turnaround", "Operating systems", "A process arrives at time 2 and finishes at time 11. What is its turnaround time?", ["2", "9", "11", "13"], 1, "Turnaround is completion time minus arrival time, so 11 − 2 = 9."],
    ["os-sjf", "Operating systems", "Two ready jobs need 7 and 3 CPU units. Which does shortest-job-first choose?", ["The 7-unit job", "The 3-unit job", "Both jobs simultaneously", "Whichever has the largest ID"], 1, "Shortest-job-first chooses the shortest available CPU burst."],
    ["math-independent", "Maths", "If two independent events have probabilities 1/2 and 1/4, what is the probability both happen?", ["1/8", "1/6", "1/4", "3/4"], 0, "Multiply the probabilities of independent events: 1/2 × 1/4 = 1/8."],
    ["math-mean", "Maths", "What is the arithmetic mean of 4, 6, and 8?", ["4", "5", "6", "8"], 2, "The sum is 18. Divide by the three observations to get 6."],
    ["math-complement", "Maths", "If the probability of an event is 0.30, what is the probability it does not happen?", ["0.30", "0.50", "0.70", "1.30"], 2, "The event and its complement have total probability 1."],
    ["sql-filter", "Databases", "Which clause filters rows before aggregation?", ["ORDER BY", "WHERE", "SELECT", "HAVING"], 1, "WHERE filters source rows. HAVING filters groups after aggregation."],
    ["sql-join", "Databases", "Which join keeps every row from the left table even without a match?", ["INNER JOIN", "CROSS JOIN", "LEFT JOIN", "SELF JOIN"], 2, "A left join keeps unmatched left rows and fills the right columns with NULL."],
    ["sql-count", "Databases", "Which expression counts all rows in a query result?", ["COUNT(*)", "SUM(*)", "ORDER BY *", "DISTINCT *"], 0, "COUNT(*) counts rows, including rows with NULL values in some columns."]
  ].map(([id, topic, prompt, options, answer, explanation]) => ({ id, topic, prompt, options, answer, explanation, course: "" })),
  lessons: [
    {
      id: "html-form", kind: "html", title: "Build a course form", skill: "HTML · Forms",
      objective: "Make a form with a Units label, a number input, and a submit button.",
      lesson: "A form groups inputs. Give the input an id, point a visible label at it with for, and use the submit button to represent the form's main action.",
      starter: "<h1>Semester GPA</h1>\n<form>\n  <!-- Add your label, input and button here -->\n</form>",
      hints: ["Put your controls inside the form.", "Match the label's for value with the input's id.", "Use type=\"number\" on the input and type=\"submit\" on the button."],
      solution: "<h1>Semester GPA</h1>\n<form>\n  <label for=\"units\">Units</label>\n  <input id=\"units\" type=\"number\" min=\"1\" required>\n  <button type=\"submit\">Calculate GPA</button>\n</form>"
    },
    {
      id: "weighted-gpa", kind: "js", title: "Calculate a weighted GPA", skill: "JavaScript · Functions and loops",
      objective: "Return the GPA from an array of courses. Return 0 if the total units are 0.",
      lesson: "Each course has units and points. A three-unit course contributes more to GPA than a one-unit course. Accumulate total units and weighted points as you loop through the courses.",
      starter: "function calculateGpa(courses) {\n  let totalUnits = 0;\n  let totalPoints = 0;\n\n  // Loop through the courses and update both totals.\n\n  return 0;\n}",
      hints: ["A for...of loop lets you read each course.", "Add course.units to totalUnits and course.units * course.points to totalPoints.", "If totalUnits is 0 return 0. Otherwise return totalPoints divided by totalUnits."],
      solution: "function calculateGpa(courses) {\n  let totalUnits = 0;\n  let totalPoints = 0;\n  for (const course of courses) {\n    totalUnits += course.units;\n    totalPoints += course.units * course.points;\n  }\n  return totalUnits === 0 ? 0 : totalPoints / totalUnits;\n}",
      functionName: "calculateGpa",
      cases: [
        { name: "3-unit A and 2-unit B", input: [[{ units: 3, points: 5 }, { units: 2, points: 4 }]], expected: 4.6 },
        { name: "Failing grade still counts its units", input: [[{ units: 1, points: 5 }, { units: 1, points: 0 }]], expected: 2.5 },
        { name: "Empty semester", input: [[]], expected: 0 }
      ]
    },
    {
      id: "revision-list", kind: "js", title: "Find unfinished study tasks", skill: "JavaScript · Arrays and filtering",
      objective: "Return the titles of unfinished tasks in the same order.",
      lesson: "Each task has a title and a done flag. Filtering keeps certain rows. Mapping converts each kept row into its title.",
      starter: "function remainingTitles(tasks) {\n  // Keep unfinished tasks and return only their titles.\n  return [];\n}",
      hints: ["Check whether task.done is false.", "Use filter to keep unfinished tasks.", "Use map to return task.title for each item."],
      solution: "function remainingTitles(tasks) {\n  return tasks.filter(task => !task.done).map(task => task.title);\n}",
      functionName: "remainingTitles",
      cases: [
        { name: "Mixed tasks", input: [[{ title: "Read notes", done: true }, { title: "Try quiz", done: false }]], expected: ["Try quiz"] },
        { name: "All tasks finished", input: [[{ title: "Read notes", done: true }]], expected: [] },
        { name: "Order is preserved", input: [[{ title: "A", done: false }, { title: "B", done: false }]], expected: ["A", "B"] }
      ]
    }
  ]
};

// Original subject practice. These are not copied exam papers.
window.GradePathCatalog.examResources = {
  WAEC: ["WAEC e-Learning", "Subject resources and Chief Examiners’ reports.", "https://waeconline.org.ng/e-learning/"],
  NECO: ["NECO SSCE Internal", "Exam information from the National Examinations Council.", "https://neco.gov.ng/exams/ssce-internal"],
  JAMB: ["JAMB IBASS", "Check the syllabus and subject combination for your intended programme.", "https://ibass.jamb.gov.ng/"]
};
window.GradePathCatalog.examQuestions = [
  ["eng-agree", "English", "Choose the correct verb: Each of the students ___ a notebook.", ["have", "has", "having", "are having"], 1, "Each is singular, so use has."],
  ["eng-vocab", "English", "Which word is closest in meaning to reluctant?", ["Eager", "Careless", "Unwilling", "Certain"], 2, "A reluctant person is unwilling or hesitant to do something."],
  ["eng-comprehension", "English", "Ada left early because she expected traffic. What motivated her decision?", ["She missed the bus", "She anticipated a delay", "Traffic had cleared", "She forgot the time"], 1, "The phrase 'expected traffic' shows that Ada planned for a possible delay."],
  ["eng-tense", "English", "Choose the correct completion: By the time we arrived, the lecture ___.", ["has begun", "begins", "had begun", "will begin"], 2, "The earlier past action uses the past perfect, had begun."],
  ["math-linear", "Mathematics", "If 3x + 5 = 20, what is x?", ["3", "5", "8", "15"], 1, "Subtract 5 from both sides, then divide by 3."],
  ["math-prob", "Mathematics", "A bag contains 3 red and 2 blue balls. What is the probability of drawing a blue ball?", ["2/3", "3/5", "1/2", "2/5"], 3, "Two of the five equally likely balls are blue."],
  ["math-percent", "Mathematics", "A ₦4,000 item is discounted by 15%. What is its sale price?", ["₦3,400", "₦3,600", "₦3,850", "₦4,600"], 0, "15% of ₦4,000 is ₦600. Subtract it from ₦4,000."],
  ["math-gradient", "Mathematics", "What is the gradient of the line through (1, 2) and (3, 8)?", ["2", "3", "4", "6"], 1, "Change in y divided by change in x is (8 − 2) / (3 − 1) = 3."],
  ["physics-ohm", "Physics", "A 6 Ω resistor carries a current of 2 A. What voltage is across it?", ["3 V", "8 V", "12 V", "18 V"], 2, "Use Ohm’s law: V = IR = 2 × 6 = 12 V."],
  ["physics-force", "Physics", "What net force accelerates a 4 kg object at 3 m/s²?", ["0.75 N", "1 N", "7 N", "12 N"], 3, "Use Newton’s second law: F = ma = 4 × 3 = 12 N."],
  ["physics-energy", "Physics", "What energy change takes place in an electric kettle?", ["Electrical to thermal", "Thermal to electrical", "Chemical to gravitational", "Nuclear to sound"], 0, "The heating element converts electrical energy into thermal energy."],
  ["physics-wave", "Physics", "A wave travels at 20 m/s and has a wavelength of 4 m. What is its frequency?", ["0.2 Hz", "5 Hz", "16 Hz", "80 Hz"], 1, "Frequency is wave speed divided by wavelength: 20 ÷ 4 = 5 Hz."],
  ["chem-atomic", "Chemistry", "Which particle count determines the atomic number of an element?", ["Neutrons", "Electrons and neutrons", "Protons", "All nucleons"], 2, "Atomic number is the number of protons in the nucleus."],
  ["chem-ph", "Chemistry", "A solution has a pH of 3. How is it classified?", ["Acidic", "Neutral", "Alkaline", "Always a salt"], 0, "At ordinary classroom conditions, a pH below 7 indicates acidity."],
  ["chem-mole", "Chemistry", "How many moles are in 36 g of water? Use 18 g/mol.", ["0.5 mol", "1 mol", "2 mol", "18 mol"], 2, "Moles = mass ÷ molar mass = 36 ÷ 18 = 2."],
  ["chem-mixture", "Chemistry", "Which method separates an insoluble solid from a liquid?", ["Fractional distillation", "Filtration", "Sublimation", "Crystallisation"], 1, "The filter retains insoluble solid particles while liquid passes through."],
  ["bio-cell", "Biology", "Which structure controls what enters and leaves a cell?", ["Cell membrane", "Ribosome", "Chromosome", "Mitochondrion"], 0, "The selectively permeable cell membrane regulates exchange."],
  ["bio-photosynthesis", "Biology", "Which gas is released during oxygenic photosynthesis?", ["Carbon dioxide", "Nitrogen", "Methane", "Oxygen"], 3, "Plants release oxygen when water is split during the light-dependent reactions."],
  ["bio-ecology", "Biology", "Which organism is a producer in a simple food chain?", ["Grasshopper", "Grass", "Frog", "Hawk"], 1, "Grass produces organic matter using sunlight through photosynthesis."],
  ["bio-blood", "Biology", "What is the main role of red blood cells?", ["Produce digestive enzymes", "Transport oxygen", "Absorb food", "Form antibodies"], 1, "Haemoglobin in red blood cells carries oxygen."],
  ["econ-cost", "Economics", "What is the opportunity cost of choosing to study instead of working a paid shift?", ["The time spent studying and the wages combined", "The wages from the next-best forgone shift", "The price of every book owned", "Zero, because study is free"], 1, "Opportunity cost is the value of the next-best alternative forgone."],
  ["econ-demand", "Economics", "Other things equal, what normally happens to quantity demanded when price rises?", ["It falls", "It rises", "It always stays constant", "It becomes supply"], 0, "Under the law of demand, a higher price generally reduces quantity demanded."],
  ["econ-inflation", "Economics", "Which statement describes inflation?", ["One product’s price rises once", "A sustained increase in the general price level", "People buy fewer imports", "Tax revenue increases"], 1, "Inflation concerns the general price level over time."],
  ["econ-scarcity", "Economics", "Why do households have to make choices?", ["Resources are limited relative to wants", "Every good has the same price", "Income is unlimited", "Only governments face scarcity"], 0, "Scarcity means available resources cannot satisfy every want."],
  ["gov-powers", "Government", "What is a main purpose of separating legislative, executive, and judicial powers?", ["Reduce checks on government", "Concentrate all authority in one office", "Limit abuse through checks and balances", "Eliminate courts"], 2, "Distinct branches help check each other’s authority."],
  ["gov-rule", "Government", "What does the rule of law require?", ["Only citizens follow laws", "Laws apply to citizens and government officials", "Courts are always controlled by ministers", "Laws are optional during elections"], 1, "Public officials and ordinary citizens are both subject to the law."],
  ["gov-federal", "Government", "What distinguishes a federal system?", ["Power is divided constitutionally between levels of government", "Only one office can make laws", "Local officials never make decisions", "Courts have no authority"], 0, "The constitution assigns powers to national and subnational governments."],
  ["lit-simile", "Literature in English", "Which sentence contains a simile?", ["The classroom was a zoo", "The wind whispered", "She ran like the wind", "The door closed"], 2, "A simile compares using words such as like or as."],
  ["lit-irony", "Literature in English", "The audience knows a fact that the main character does not. Which device is this?", ["Dramatic irony", "Alliteration", "Hyperbole", "Onomatopoeia"], 0, "Dramatic irony depends on a difference between the audience’s and character’s knowledge."],
  ["lit-narrator", "Literature in English", "What is the speaker using in the sentence 'I walked home alone'?", ["Second-person narration", "First-person narration", "Third-person narration", "An omniscient viewpoint"], 1, "I signals that the narrator speaks in the first person."]
].map(([id, subject, prompt, options, answer, explanation]) => ({
  id: "exam-" + id, subject, topic: subject, exams: ["WAEC", "NECO", "JAMB"], prompt, options, answer, explanation, course: ""
}));
