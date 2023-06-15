function checkIfContentIsLoaded() {
    const content = document.querySelector(".card-body");
    if (content) readData();
    else setTimeout(checkIfContentIsLoaded, 100);
}

checkIfContentIsLoaded();

// let analysisShown = false;

// function showAppContent() {
//     const appWrapperPosition = "body > div > div > div > div > main > div";

//     const appWrapper = document.querySelector(appWrapperPosition);
//     if (appWrapper) {
//         appWrapper.appendChild(createWrapper());
//         const wrapper = document.querySelector(appWrapperPosition + " > div");

//         wrapper.appendChild(createContent());
//         const content = document.querySelector(appWrapperPosition + " > div > div");
        
//         content.appendChild(createHeading());
//         content.appendChild(createButton());

//         const button = document.querySelector(appWrapperPosition + " > div > div > button");
//         if (button) {
//             button.addEventListener("click", () => {
//                 if (!analysisShown) {
//                     readData();
//                     analysisShown = true;
//                 }
//             });
//         }
//     }
// }

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
            const average = createAverageElement(subjects[i].average);
            content.appendChild(average);
            wrapper[i].appendChild(content);
        }
    }
}

const createAnalysisContent = () => {
    const content = document.createElement("div");
    content.style = "display: flex; width: 100% !important; flex-direction: column; gap: 20px;";
    return content;
}

const createAverageElement = (average) => {
    const elem = document.createElement("p");
    elem.innerHTML = "<b>Durchschnitt:</b> " + average;
    return elem;
}

const createWrapper = () => {
    const wrapper = document.createElement("div");
    wrapper.style = "display: flex; width: 100% !important; flex-direction: column; justify-content: center; align-items: center;"
    return wrapper;
}

const createContent = () => {
    const content = document.createElement("div");
    content.style = "display: flex; width: 100% !important; flex-direction: column; justify-content: center; align-items: center; gap: 20px;";
    return content;
}

const createHeading = () => {
    const h = document.createElement("h2");
    h.innerText = "BetterSchule is active";
    h.style = "color: #fff; background-color: red; padding: 10px 20px; border-radius: 5px; font-weight: normal; font-size: 1.5rem; margin-top: 20px; text-align: center;"
    return h;
}

const createButton = () => {
    const button = document.createElement("button");
    button.innerText = "Show analysis";
    button.style = "background-color: #007bff; color: #fff; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;"
    return button;
}