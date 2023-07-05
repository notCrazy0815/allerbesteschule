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
    if (document.getElementById("btn-radios-view")) document.getElementById("btn-radios-view").remove();
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

const calculateTotalAverage = (subjects) => {
    let sum = 0;
    let count = 0;
    for (subject of subjects) {
        if (subject.average > 0) {
            sum += subject.finalGrade;
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
        subject.finalGrade = Math.round(subject.average);
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

const calculateMonthlyAverages = (grades) => {
    const monthlyAverages = [];
    const monthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
    const firstMonth = new Date(grades.sort((a, b) => a.date - b.date)[0].date).getMonth();
    const gradesByMonth = [];
    for (let i = 0; i < 12; i++) {
        gradesByMonth.push([]);
    }
    grades.forEach(grade => {
        const month = new Date(grade.date).getMonth();
        gradesByMonth[month].push(grade);
    });
    gradesByMonth.forEach((month, index) => {
        const sum = month.reduce((a, b) => a + b.value, 0);
        if (sum > 0) monthlyAverages.push({ month: monthNames[index % 12], average: +(Math.round(sum / month.length + "e+2")  + "e-2") });
        else monthlyAverages.push({ month: monthNames[index % 12], average: 0 });
    });
    for (let i = 0; i < firstMonth; i++) {
        monthlyAverages.push(monthlyAverages.shift());
    }
    return monthlyAverages;
}

const getGrades = (subjects) => {
    const grades = [];
    subjects.forEach(subject => {
        subject.grades.forEach(category => {
            category.grades.forEach(grade => {
                grades.push(grade);
            });
        });
    });
    return grades;
}

const saveProbableFinalGrade = (value, subject) => {
    const send = async (val, sub) => {
        const response = await chrome.runtime.sendMessage({ message: "saveFinalGrade", value: parseInt(val), subject: sub });
    
        if (response.message === "success") {
            const content = document.querySelector(".card-body");
            content.innerHTML = "";
            injectContent(response.subjects);
        }
    };

    send(value, subject);
}

const createContent = () => {
    const content = document.createElement("div");
    content.style = "display: flex; flex-direction: column; width: 100% !important; margin-bottom: 1rem; gap: 2rem;";
    return content;
}

const createAnalysisContent = (subjects) => {
    const content = document.createElement("div");
    content.style = "display: flex; width: 100%; flex-direction: column; gap: 0.5rem;";

    const contentHeader = document.createElement("div");
    contentHeader.style = "display: flex; justify-content: space-between; align-items: center;";
    contentHeader.appendChild(createHeading("Analyse"));

    const chartsContent = createChartsContent();
    const viewBtn = createViewAnalysisButton("Anzeigen");
    viewBtn.addEventListener("click", () => {
        if (viewBtn.innerText === "Anzeigen") {
            chartsContent.style.display = "grid";
            viewBtn.innerText = "Schließen";
        } else {
            chartsContent.style.display = "none";
            viewBtn.innerText = "Anzeigen";
        }
    });
    contentHeader.appendChild(viewBtn);

    chartsContent.appendChild(createChartContainer(createGradeDistributionChartCanvas(subjects), "Notenverteilung"));
    chartsContent.appendChild(createChartContainer(createMonthlyAveragesChartCanvas(getGrades(subjects)), "Durchschnitt pro Monat"));
    content.appendChild(contentHeader);
    content.appendChild(chartsContent);
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

const createViewAnalysisButton = (text) => {
    const btn = document.createElement("button");
    btn.innerHTML = text;
    btn.style = "width: min-content; padding: 0.5rem 1rem; border-radius: 0.5rem; border: none; background-color: #ddd; color: black; cursor: pointer; white-space: nowrap; transition: background-color 0.1s ease-in-out;"
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
    t.appendChild(createProbableFinalGradeRow(subject));
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
    tr.style = "font-weight: bold";
    tr.appendChild(createTableCell("Insgesamt"));
    tr.appendChild(createTableCell(subject.average));
    tr.appendChild(createTableCell(""));
    return tr;
}

const createProbableFinalGradeRow = (subject) => {
    const tr = document.createElement("tr");
    tr.style = "border-bottom: 1px solid #ddd; font-weight: bold; background-color: rgb(245, 245, 245)";
    tr.appendChild(createTableCell("Voraussichtliche Endnote"));
    const middleCell = createTableCell("");
    const input = createEditProbableFinalGradeInput(subject.finalGrade, subject.average);
    middleCell.appendChild(input);
    middleCell.style = "padding: 0";
    tr.appendChild(middleCell);
    const lastCell = createTableCell("");
    if (calculcatePossibleFinalGrades(subject.average).length > 1) {
        lastCell.appendChild(createEditProbableFinalGradeButton(subject.average, input, subject.name));
    } else {
        lastCell.appendChild(createTableCell(""));
    }
    tr.appendChild(lastCell);
    return tr;
}

const createEditProbableFinalGradeInput = (finalGrade, average) => {
    const inp = document.createElement("input");
    inp.type = "number";
    inp.value = finalGrade;
    inp.readOnly = true;
    const possibleFinalGrades = calculcatePossibleFinalGrades(average);
    inp.min = possibleFinalGrades[0];
    inp.max = possibleFinalGrades[possibleFinalGrades.length - 1];
    inp.style = "width: 100%; padding: 0.5rem 1rem; border-radius: 0.5rem; border: none; background-color: transparent; color: black; cursor: pointer; white-space: nowrap; transition: background-color 0.1s ease-in-out; font-weight: bold;";
    return inp;
}

const calculcatePossibleFinalGrades = (average) => {
    const gradeRanges = [[1.0, 1.6], [1.4, 2.6], [2.4, 3.6], [3.4, 4.6], [4.4, 5.6], [5.4, 6.0]];
    const possibleGrades = [];
    for (let i = 0; i < gradeRanges.length; i++) {
        const [min, max] = gradeRanges[i];
        if (average >= min && average <= max) {
          possibleGrades.push(i + 1);
        }
    }
    return possibleGrades;
}

const createEditProbableFinalGradeButton = (average, input, subject) => {
    const btn = document.createElement("button");
    btn.innerText = "Bearbeiten";
    btn.style = "width: min-content; padding: 0.5rem 1rem; border-radius: 0.5rem; border: none; background-color: #ddd; color: black; cursor: pointer; white-space: nowrap; transition: background-color 0.1s ease-in-out;"
    btn.addEventListener("mouseover", () => btn.style.backgroundColor = "#ccc");
    btn.addEventListener("mouseout", () => btn.style.backgroundColor = "#ddd");

    let presetGrade = input.value;
    const possibleFinalGrades = calculcatePossibleFinalGrades(average);

    input.max = possibleFinalGrades[possibleFinalGrades.length - 1];
    input.min = possibleFinalGrades[0];

    const checkInput = () => {
        return possibleFinalGrades.includes(parseInt(input.value));
    }

    const enableInput = () => {
        input.readOnly = false;
        input.style.backgroundColor = "#ddd";
        input.style.cursor = "text";
        btn.innerText = "Speichern";
    };

    const disableInput = () => {
        if (checkInput()) {
            input.readOnly = true;
            input.style.backgroundColor = "transparent";
            input.style.cursor = "pointer";
            btn.innerText = "Bearbeiten";

            if (input.value !== presetGrade) {
                saveProbableFinalGrade(input.value, subject);
                presetGrade = input.value;
            }
        } else {
            input.value = presetGrade;
            disableInput();
        }
    };

    btn.addEventListener("click", () => {
        if (btn.innerText === "Bearbeiten") {
            enableInput();
        } else {
            disableInput();
        }
    });

    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            disableInput();
        }
    });
    
    return btn;
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

const createChartsContent = () => {
    const content = document.createElement("div");
    content.style = "width: 100%; display: none; grid-template-columns: 1fr 1fr;";
    return content;
}

const createChartContainer = (chart, title) => {
    const container = document.createElement("div");
    container.style = "display: flex; flex-direction: column; justify-content: center; align-items: center";

    const chartContainer = document.createElement("div");
    const size = document.querySelector(".card-body").offsetWidth / 2 * 0.8;
    chartContainer.style = `max-width ${size}px; max-height: ${size}px; width: ${size}px; height: ${size}px`;

    const chartTitle = document.createElement("p");
    chartTitle.innerText = title;
    chartTitle.style = "font-weight: bold;";

    chartContainer.appendChild(chart);
    container.appendChild(chartTitle);
    container.appendChild(chartContainer);
    return container;
}

const createGradeDistributionChartCanvas = (grades) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const gradeDistribution = calculateGradeDistribution(grades);
    const chart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: gradeDistribution.map(grade => grade.value),
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
    return canvas;
}

const createMonthlyAveragesChartCanvas = (grades) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const monthlyAverages = calculateMonthlyAverages(grades).filter(month => month.average !== 0);
    const chart = new Chart(ctx, {
        type: "line",
        data: {
            labels: monthlyAverages.map(month => month.month),
            datasets: [{
                label: "Durchschnitt",
                data: monthlyAverages.map(month => month.average),
                backgroundColor: "#3490dc",
                borderColor: "#3490dc",
                fill: false
            }]
        },
        options: {
            legend: {
                display: false
            },
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    reverse: true
                }
            }
        }
    });
    return canvas;
}