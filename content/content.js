function checkIfContentIsLoaded() {
    if (document.querySelector(".card-body")) readData();
    else setTimeout(checkIfContentIsLoaded, 100);
}

function readData() {
    const dataContent = document.querySelectorAll(".card-body > div > *");
    const subjects = [];

    for (let i = 0; i < dataContent.length; i++) {
        let currentSubjectName = "";
        if (dataContent[i].tagName === "H2") {
            currentSubjectName = dataContent[i].children[0].innerText;
            subjects.push({ name: currentSubjectName, grades: [], average: 0 });
        } else if (dataContent[i].tagName === "TABLE") {
            const categories = [];
            const grades = [];
            for (let j = 0; j < dataContent[i].children[0].children[0].children.length; j++) {
                const category = dataContent[i].children[0].children[0].children[j].innerText;
                if (category.trim() !== "") {
                    categories.push(category);
                    const tempGrades = [];
                    for (let k = 0; k < dataContent[i].children[1].children[0].children[j].children[0].children.length; k++) {
                        const grade = formatGrade(dataContent[i].children[1].children[0].children[j].children[0].children[k].innerText);
                        if (grade) tempGrades.push(grade);
                    }
                    grades.push(tempGrades);
                }
            }

            for (let j = 0; j < categories.length; j++) {
                subjects[subjects.length - 1].grades.push({ category: categories[j], grades: grades[j] });
            }
        }
    }

    subjects.forEach(subject => {
        subject.average = calculateAverage(subject.grades);
    });

    injectAnalysis(subjects);
}

function injectAnalysis(subjects) {
    const wrapper = document.querySelectorAll(".card-body > div");
    for (let i = 0; i < wrapper.length; i++) {
        if (subjects[i].grades.length > 0) {
            const content = createAnalysisContent();
            content.appendChild(createAverageElement(subjects[i].average));
            content.appendChild(createViewMoreButton(subjects[i]));
            wrapper[i].appendChild(content);
        }
    }

    const inTotalWrapper = document.querySelector(".card-body");
    const inTotalContent = createAnalysisContent();

    inTotalContent.appendChild(createHeading("Gesamt"));
    inTotalContent.appendChild(createAverageElement(calculateTotalAverage(subjects)));
    inTotalWrapper.insertBefore(inTotalContent, inTotalWrapper.children[1]);
}

function showAnalysis(subject) {
    console.log(subject);
}

const createAnalysisContent = () => {
    const content = document.createElement("div");
    content.style = "display: flex; width: 100% !important; margin-bottom: 1rem; justify-content: space-between; align-items: center;";
    return content;
}

const createAverageElement = (average) => {
    const elem = document.createElement("p");
    elem.innerHTML = "<b>Durchschnitt:</b> " + average;
    elem.style = "margin: 0; margin-left: 10px;";
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

const calculateAverage = (categories) => {
    // TODO: Gewichtung
    const grades = [];
    categories.forEach(category => {
        category.grades.forEach(grade => {
            grades.push(grade);
        });
    });
    const sum = grades.reduce((a, b) => a + b, 0);
    return +(Math.round(sum / grades.length + "e+2")  + "e-2");
}

const formatGrade = (grade) => {
    const g = grade.trim().split("");
    if (parseInt(g[0])) return parseInt(g[0]);
    return null;
}

checkIfContentIsLoaded();