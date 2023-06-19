readData();
checkIfContentIsLoaded();

let subjects = [];

async function checkIfContentIsLoaded() {
    if (document.querySelector(".card-body") && subjects.length > 0) loadData();
    else setTimeout(checkIfContentIsLoaded, 100);
}

async function readData() {
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
}

function loadData() {
    const wrapper = document.querySelector(".card-body");
    wrapper.innerHTML = "";
    subjects = calculateAverages(subjects);
    injectAnalysis(subjects);
}

function injectAnalysis(subjects) {
    const wrapper = document.querySelector(".card-body");
    const content = createAnalysisContent();
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

const createAnalysisContent = () => {
    const content = document.createElement("div");
    content.style = "display: flex; flex-direction: column; width: 100% !important; margin-bottom: 1rem; gap: 2rem;";
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

const createViewMoreButton = (subject) => {
    const btn = document.createElement("button");
    btn.innerHTML = "Mehr anzeigen >";
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
    t.style = "width: 100%; border-collapse: collapse; border: 1px solid #ddd; border-radius: 0.5rem; overflow: hidden;";
    t.appendChild(createTableHeader());
    subject.grades.forEach(category => {
        t.appendChild(createTableRow(category));
    });
    t.appendChild(createInTotalRow(subject));
    return t;
}

const createInTotalRow = (subject) => {
    const tr = document.createElement("tr");
    tr.style = "border-bottom: 1px solid #ddd; font-weight: bold";
    tr.appendChild(createTableCell("Insgesamt"));
    tr.appendChild(createTableCell(subject.average));
    const lastCell = createTableCell("");
    lastCell.appendChild(createViewMoreButton(subject));
    tr.appendChild(lastCell);
    return tr;
}

const createTableHeader = () => {
    const tr = document.createElement("tr");
    tr.style = "border-bottom: 1px solid #ddd; background-color: #ddd;";
    tr.appendChild(createTableHeaderCell("Kategorie"));
    tr.appendChild(createTableHeaderCell("Durchschnitt"));
    tr.appendChild(createTableHeaderCell("Noten"));
    return tr;
}

const createTableHeaderCell = (text) => {
    const th = document.createElement("th");
    th.style = "padding: 0.5rem 1rem;";
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
    toolTip.style = "display: none; width: auto; height: auto; background-color: #bbb; padding: 0.5rem; border-radius: 0.5rem; z-index: 1; white-space: nowrap; font-size: 0.8rem; position: absolute; margin-top: -5rem;";
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