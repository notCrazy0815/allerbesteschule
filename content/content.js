const appWrapperPosition = "body > #app > div > div > div";

const appWrapper = document.querySelector(appWrapperPosition);
if (appWrapper) {
    appWrapper.appendChild(createWrapper());
    const wrapper = document.querySelector(appWrapperPosition + " > div");

    wrapper.appendChild(createContent());
    const content = document.querySelector(appWrapperPosition + " > div > div");
    
    content.appendChild(createHeading());
    content.appendChild(createButton());

    const button = document.querySelector(appWrapperPosition + " > div > div > button");
    if (button) {
        button.addEventListener("click", () => {
            readData();
        });
    }
}

function createWrapper() {
    const wrapper = document.createElement("div");
    wrapper.style.display = "flex";
    wrapper.style.width = "100%";
    wrapper.style.flexDirection = "column";
    wrapper.style.justifyContent = "center";
    wrapper.style.alignItems = "center";
    return wrapper;
}

function createContent() {
    const content = document.createElement("div");
    content.style.display = "flex";
    content.style.width = "50%";
    content.style.flexDirection = "column";
    content.style.justifyContent = "center";
    content.style.alignItems = "center";
    content.style.gap = "20px";
    return content;
}

function createHeading() {
    const h = document.createElement("h2");
    h.innerText = "BetterSchule is active";
    h.style.color = "#fff";
    h.style.backgroundColor = "red";
    h.style.padding = "10px 20px";
    h.style.borderRadius = "5px";
    h.style.fontWeight = "normal";
    h.style.fontSize = "1.5rem";
    h.style.marginTop = "20px";
    h.style.textAlign = "center";
    return h;
}

function createButton() {
    const button = document.createElement("button");
    button.innerText = "Show analysis";
    button.style.backgroundColor = "#007bff";
    button.style.color = "#fff";
    button.style.border = "none";
    button.style.padding = "10px 20px";
    button.style.borderRadius = "5px";
    button.style.cursor = "pointer";
    return button;
}

function readData() {
    const wrapper = document.querySelectorAll("body > #app > div > div > div > main > div > .card > .card-body > div > *");   
    const subjects = [];

    for (let i = 0; i < wrapper.length; i++) {
        const childs = wrapper[i].children;

        if (wrapper[i].tagName === "H2") {
            for (let j = 0; j < childs.length; j++) {
                if (childs[j].tagName === "SPAN") {
                    subjects.push({
                        name: childs[j].innerText,
                        grades: [],
                        average: null
                    });
                }
            }
        } else if (wrapper[i].tagName === "TABLE") {
            for (let j = 0; j < childs.length; j++) {
                if (childs[j].tagName === "TBODY") {
                    const tr = childs[j].children;
                    const td = tr[0].children;

                    for (let k = 0; k < td.length; k++) {
                        if (td[k].innerText.trim() != "") {
                            const grades = td[k].innerText.trim().split("\n");

                            grades.forEach(grade => {
                                grade = grade.split("");
                                let gradeNum;
                                gradeNum = parseInt(grade[0]);

                                if (gradeNum && gradeNum > 0) {
                                    subjects[subjects.length - 1].grades.push(gradeNum);
                                }
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
            for (grade of subject.grades) {
                sum += grade;
            }
            subject.average = +(Math.round(sum / subject.grades.length + "e+2")  + "e-2");
        }
    }

    console.log(subjects);
}