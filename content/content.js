function checkIfContentIsLoaded() {
    const content = document.querySelector(".card-body");
    if (content) readData();
    else setTimeout(checkIfContentIsLoaded, 100);
}

checkIfContentIsLoaded();

function readData() {
    const wrapper = document.querySelectorAll(".card-body > div > *");   
    const subjects = [];

    for (let i = 0; i < wrapper.length; i++) {
        const childs = wrapper[i].children;
        if (wrapper[i].tagName === "H2") {
            for (child of childs) {
                if (child.tagName === "SPAN") {
                    subjects.push({ name: child.innerText, grades: [], average: 0 });
                }
            }
        } else if (wrapper[i].tagName === "TABLE") {
            for (child of childs) {
                if (child.tagName === "TBODY") {
                    for (td of child.children[0].children) {
                        if (td.innerText.trim() != "") {
                            td.innerText.trim().split("\n").forEach(grade => {
                                const gradeNum = parseInt(grade.split("")[0]);
                                if (gradeNum && gradeNum > 0) subjects[subjects.length - 1].grades.push(gradeNum);
                            });
                        }
                    }
                }
            }
        }
    }

    for (subject of subjects) {
        if (subject.grades.length > 0) {
            let sum = 0;
            for (grade of subject.grades) sum += grade;
            subject.average = +(Math.round(sum / subject.grades.length + "e+2")  + "e-2");
        }
    }

    injectAnalysis(subjects);
}

function injectAnalysis(subjects) {
    const wrapper = document.querySelectorAll(".card-body > div");
    for (let i = 0; i < wrapper.length; i++) {
        if (subjects[i].grades.length > 0) {
            const content = createAnalysisContent();
            content.appendChild(createAverageElement(subjects[i].average));
            content.appendChild(createViewMoreButton());
            wrapper[i].appendChild(content);
        }
    }

    const inTotalWrapper = document.querySelector(".card-body");
    const inTotalContent = createAnalysisContent();

    inTotalContent.appendChild(createHeading("Gesamt"));
    inTotalContent.appendChild(createAverageElement(calculateAverage(subjects)));
    inTotalWrapper.insertBefore(inTotalContent, inTotalWrapper.children[1]);

    console.log(calculateAverage(subjects));
}

const createAnalysisContent = () => {
    const content = document.createElement("div");
    content.style = "display: flex; width: 100% !important; margin-bottom: 1rem; justify-content: space-between; align-items: center;";
    return content;
}

const createAverageElement = (average) => {
    const elem = document.createElement("p");
    elem.innerHTML = "<b>Durchschnitt:</b> " + average;
    return elem;
}

const createViewMoreButton = () => {
    const btn = document.createElement("button");
    btn.innerHTML = "Mehr anzeigen >";
    btn.style = "width: min-content; padding: 0.5rem 1rem; border-radius: 0.5rem; border: none; background-color: #ddd; color: black; cursor: pointer; white-space: nowrap;"
    return btn;
}

const createHeading = (text) => {
    const h = document.createElement("h2");
    h.innerText = text;
    return h;
}

const calculateAverage = (subjects) => {
    let sum = 0;
    for (subject of subjects) {
        if (subject.average > 0) sum += subject.average;
    }
    return +(Math.round(sum / subjects.length + "e+2")  + "e-2");
}