async function checkIfContentIsLoaded() {
    if (document.querySelector(".card-body")) await readData();
    else setTimeout(checkIfContentIsLoaded, 100);
}

async function readData() {
    const res = await fetch(`https://beste.schule/web/students/${location.href.split("/")[4]}?include=grades,subjects`);
    const data = await res.json();
    let subjects = data.data.subjects.map(subject => {
        return { name: subject.name, grades: [], average: 0 };
    });
    const grades = data.data.grades.filter(grade => formatGrade(grade.value)).map(grade => {
        return { value: formatGrade(grade.value), date: Date.parse(grade.given_at), name: grade.collection.name, category: grade.collection.type, subject: grade.collection.subject.name };
    });
    grades.forEach(grade => {
        const subject = subjects.find(subject => subject.name === grade.subject);
        if (subject) {
            const category = subject.grades.find(category => category.name === grade.category);
            if (category) category.grades.push(grade);
            else subject.grades.push({ name: grade.category, grades: [grade], weight: 0 });
        }
    });
    
    subjects = calculateAverages(subjects);
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

const formatGrade = (grade) => {
    const g = grade.trim().split("");
    if (parseInt(g[0])) return parseInt(g[0]);
    return null;
}

checkIfContentIsLoaded();