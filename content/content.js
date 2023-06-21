chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.message === "fetchData") {
        (async () => {
            const subjects = await fetchData();
            sendResponse({ message: "success", subjects: subjects });
        })();
    } else if (request.message === "removeOldContent") {
        checkIfContentIsLoaded(removeOldContent);
        sendResponse({ message: "success" });
    } else if (request.message === "injectContent") {
        checkIfContentIsLoaded(() => injectContent(request.subjects));
        sendResponse({ message: "success" });
    } else {
        sendResponse({ message: "error" });
    }
    return true;
});

async function checkIfContentIsLoaded(thenFunc) {
    if (document.querySelector(".card-body")) {
        thenFunc();
    }
    else setTimeout(checkIfContentIsLoaded.bind(null, thenFunc), 100);
}

async function fetchData() {
    try {
        const res = await fetch(`https://beste.schule/web/students/${location.href.split("/")[4]}?include=grades,subjects`);
        const data = await res.json();
        subjects = data.data.subjects.map(subject => {
            return { name: subject.name, grades: [], average: 0 };
        });
        const grades = data.data.grades.filter(grade => formatGrade(grade.value)).map(grade => {
            return { value: formatGrade(grade.value), valueText: grade.value, date: Date.parse(grade.given_at), name: grade.collection.name, category: grade.collection.type, subject: grade.collection.subject.name };
        });
        grades.forEach(grade => {
            const subject = subjects.find(subject => subject.name === grade.subject);
            if (subject) {
                const category = subject.grades.find(category => category.name === grade.category);
                if (category) category.grades.push(grade);
                else subject.grades.push({ name: grade.category, grades: [grade] });
            }
        });
        newestGrades = grades.sort((a, b) => b.date - a.date).slice(0, 5);
        subjects = calculateAverages(subjects);
        return subjects;
    } catch(err) {
        return [];
    }
}

function removeOldContent() {
    document.querySelector(".card-body").innerHTML = "";
    document.getElementById("btn-radios-view").remove();
}

function injectContent(subjects) {
    const wrapper = document.querySelector(".card-body");
    const content = createContent();
    content.appendChild(createInTotalElement(calculateTotalAverage(subjects)));
    content.appendChild(createAnalysisContent(subjects))
    content.appendChild(createNewestGradesElement(newestGrades));
    subjects.forEach(subject => {
        if (subject.average > 0) content.appendChild(createSubjectElement(subject));
        else content.appendChild(createNoGradeElement(subject));
    });
    wrapper.appendChild(content);
}

function showAnalysis(subject) {
    console.log(subject);
}

const calculateTotalAverage = (subjects) => {
    let sum = 0;
    let count = 0;
    for (subject of subjects) {
        if (subject.average > 0) {
            sum += subject.average;
            count++;
        }
    }
    return +(Math.round(sum / count + "e+2")  + "e-2");
}

const calculateAverages = (subjects) => {
    subjects.forEach(subject => {
        let totalWeight = 0;
        let weightedSum = 0;
        let combinedGrades = [];
        const classTestNames = ["klassenarbeit", "ka", "class test", "travail de classe"];

        subject.grades.forEach(category => {
            if (classTestNames.includes(category.name.toLowerCase())) {
                const categoryWeight = 0.5;
                const categoryAverage = category.grades.reduce((a, b) => a + b.value, 0) / category.grades.length;

                totalWeight += categoryWeight;
                weightedSum += categoryAverage * categoryWeight;
            } else {
                combinedGrades = combinedGrades.concat(category.grades.map(grade => grade.value));
            }
        });

        if (combinedGrades.length > 0) {
            const combinedWeight = 1 - totalWeight;
            const combinedAverage = combinedGrades.reduce((a, b) => a + b, 0) / combinedGrades.length;
        
            totalWeight += combinedWeight;
            weightedSum += combinedAverage * combinedWeight;
        }

        subject.average = +(Math.round(weightedSum / totalWeight + "e+2")  + "e-2");
    });

    return subjects;
}

const calculateAverage = (category) => {
    const sum = category.reduce((a, b) => a + b.value, 0);
    return +(Math.round(sum / category.length + "e+2")  + "e-2");
}

const formatGrade = (grade) => {
    const g = grade.trim().split("");
    if (parseInt(g[0])) return parseInt(g[0]);
    return null;
}

const calculateGradeDistribution = (subjects) => {
    const distribution = [];
    for (let i = 0; i < 15; i++) {
        distribution.push({ value: i + 1, count: 0 });
    }
    subjects.forEach(subject => {
        subject.grades.forEach(category => {
            category.grades.forEach(grade => {
                distribution[grade.value - 1].count++;
            });
        });
    });
    return distribution.filter(grade => grade.count > 0);
}

const createContent = () => {
    const content = document.createElement("div");
    content.style = "display: flex; flex-direction: column; width: 100% !important; margin-bottom: 1rem; gap: 2rem;";
    return content;
}

const createAnalysisContent = (subjects) => {
    const content = document.createElement("div");
    content.style = "display: flex; width: 100%; flex-direction: column; gap: 0.5rem;";
    content.appendChild(createHeading("Analyse"));
    content.appendChild(createGradeDistributionChartCanvas(subjects));
    return content;
}

const createSubjectElement = (subject) => {
    const elem = document.createElement("div");
    elem.style = "display: flex; width: 100%; flex-direction: column; gap: 0.5rem;";
    elem.appendChild(createHeading(subject.name));
    elem.appendChild(createGradeTable(subject));
    return elem;
}

const createNoGradeElement = (subject) => {
    const elem = document.createElement("div");
    elem.style = "display: flex; width: 100%; flex-direction: column; gap: 0.5rem;";
    elem.appendChild(createHeading(subject.name));
    elem.appendChild(createNoGradeText());
    return elem;
}

const createNoGradeText = () => {
    const elem = document.createElement("p");
    elem.innerHTML = "Keine Noten vorhanden.";
    return elem;
}

const createAverageElement = (average) => {
    const elem = document.createElement("p");
    elem.innerHTML = "<b>Durchschnitt:</b> " + average;
    return elem;
}

const createViewAnalysisButton = (subject) => {
    const btn = document.createElement("button");
    btn.innerHTML = "Anzeigen";
    btn.style = "width: min-content; padding: 0.5rem 1rem; border-radius: 0.5rem; border: none; background-color: #ddd; color: black; cursor: pointer; white-space: nowrap; transition: background-color 0.1s ease-in-out;"
    btn.setAttribute("id", subject.name);
    btn.addEventListener("click", () => showAnalysis(subject));
    btn.addEventListener("mouseover", () => btn.style.backgroundColor = "#ccc");
    btn.addEventListener("mouseout", () => btn.style.backgroundColor = "#ddd");
    return btn;
}

const createHeading = (text) => {
    const h = document.createElement("h2");
    h.innerText = text;
    return h;
}

const createGradeTable = (subject) => {
    const t = document.createElement("table");
    t.style = "width: 100%; border-collapse: collapse; border: 1px solid #ddd; border-radius: 0.5rem; overflow: hidden; table-layout: fixed;";
    t.appendChild(createTableHeader(false));
    subject.grades.forEach(category => {
        t.appendChild(createTableRow(category));
    });
    t.appendChild(createInTotalRow(subject));
    return t;
}

const createTableHeader = (showSubject) => {
    const tr = document.createElement("tr");
    tr.style = "border-bottom: 1px solid #ddd; background-color: #ddd;";
    if (showSubject) tr.appendChild(createTableHeaderCell("Fach"));
    if (!showSubject) tr.appendChild(createTableHeaderCell("Kategorie"));
    else tr.appendChild(createTableHeaderCell("Name"));
    if (!showSubject) tr.appendChild(createTableHeaderCell("Durchschnitt"));
    if (!showSubject) tr.appendChild(createTableHeaderCell("Noten"));
    else tr.appendChild(createTableHeaderCell("Note"));
    return tr;
}

const createTableHeaderCell = (text) => {
    const th = document.createElement("th");
    th.style = "padding: 0.5rem 1rem; width: calc(100% / 3)";
    th.innerText = text;
    return th;
}

const createTableRow = (category) => {
    const tr = document.createElement("tr");
    tr.style = "border-bottom: 1px solid #ddd;";
    tr.appendChild(createTableCell(category.name));
    tr.appendChild(createTableCell(calculateAverage(category.grades)));
    const gradeCell = createTableCell("");
    gradeCell.style.display = "flex";
    gradeCell.style.gap = "0.7rem";
    gradeCell.style.flexWrap = "wrap";
    category.grades.forEach(grade => {
        gradeCell.appendChild(createGradeElem(grade));
    });
    tr.appendChild(gradeCell);
    return tr;
}

const createTableCell = (text) => {
    const td = document.createElement("td");
    td.style = "padding: 0.5rem 1rem;";
    td.innerText = text;
    return td;
}


const createInTotalRow = (subject) => {
    const tr = document.createElement("tr");
    tr.style = "border-bottom: 1px solid #ddd; font-weight: bold";
    tr.appendChild(createTableCell("Insgesamt"));
    tr.appendChild(createTableCell(subject.average));
    tr.appendChild(createTableCell(""));
    return tr;
}

const createGradeElem = (grade) => {
    const elem = document.createElement("div");
    const p = document.createElement("p");
    p.innerText = grade.valueText;
    elem.style = "display: flex; align-items: center; justify-content: center;";
    p.style = "margin: 0; font-weight: bold;";
    const toolTip = createGradeToolTip(grade);

    elem.appendChild(p);
    elem.appendChild(toolTip);

    elem.addEventListener("mouseover", () => {
        toolTip.style.display = "block";
    });

    elem.addEventListener("mouseleave", () => {
        toolTip.style.display = "none";
    });
    return elem;
}

const createGradeToolTip = (grade) => {
    const toolTip = document.createElement("div");
    toolTip.style = "display: none; width: auto; height: auto; background-color: #ccc; padding: 0.5rem; border-radius: 0.5rem; z-index: 1; white-space: nowrap; position: absolute; margin-top: -6rem;";
    const name = document.createElement("p");
    name.style = "margin: 0; font-weight: bold;";
    name.innerText = grade.name;
    const date = document.createElement("p");
    date.style = "margin: 0;";
    date.innerText = new Date(grade.date).toLocaleDateString("de-DE");
    toolTip.appendChild(name);
    toolTip.appendChild(date);
    return toolTip;
}

const createInTotalElement = (average) => {
    const elem = document.createElement("div");
    elem.style = "display: flex; width: 100%; justify-content: space-between; align-items: center;";
    elem.appendChild(createHeading("Insgesamt"));
    elem.appendChild(createAverageElement(average));
    return elem;
}

const createNewestGradesElement = (grades) => {
    const elem =  document.createElement("div");
    elem.style = "display: flex; width: 100%; flex-direction: column; gap: 0.5rem;";
    elem.appendChild(createHeading("Neueste Noten"));
    const table = document.createElement("table");
    table.style = "width: 100%; border-collapse: collapse; border: 1px solid #ddd; border-radius: 0.5rem; overflow: hidden; table-layout: fixed;";
    table.appendChild(createTableHeader(true));
    grades.forEach(grade => {
        const tr = document.createElement("tr");
        tr.style = "border-bottom: 1px solid #ddd;";
        tr.appendChild(createTableCell(grade.subject));
        tr.appendChild(createTableCell(grade.name));
        const gradeCell = createTableCell("");
        gradeCell.style.display = "flex";
        gradeCell.style.gap = "0.7rem";
        gradeCell.style.flexWrap = "wrap";
        gradeCell.appendChild(createGradeElem(grade));
        tr.appendChild(gradeCell);
        table.appendChild(tr);
    });
    elem.appendChild(table);
    return elem;
}

const createGradeDistributionChartCanvas = (grades) => {
    const container = document.createElement("div");
    const size = document.querySelector(".card-body").offsetWidth / 2 * 0.9;
    container.style = `max-width: ${size}px; max-height: ${size}px;`;
    const canvas = document.createElement("canvas");
    container.appendChild(canvas);
    canvas.setAttribute("id", "gradeDistributionChart");
    const ctx = canvas.getContext("2d");
    const gradeDistribution = calculateGradeDistribution(grades);
    const chart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: [].concat(...gradeDistribution.map(grade => grade.value)),
            datasets: [{
                label: "Anzahl",
                data: gradeDistribution.map(grade => grade.count),
                backgroundColor: "#3490dc"
            }]
        },
        options: {
            legend: {
                display: false
            },
            responsive: true,
            maintainAspectRatio: false,
        }
    });
    return container;
}
