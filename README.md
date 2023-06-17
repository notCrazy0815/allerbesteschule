# Allerbeste Schule

Allerbeste Schule is a Chrome extension for the [beste.schule](https://beste.schule) website. This website offers schools the possibility to organize and manage grades and timetables online. This allows the student to see their grades directly.
But there is one problem:
The student is only shown the grades, without an average, without any interpretation or analysis of the grades.

### How does the extension solve this problem?

The extension offers the student extensive possibilities to analyze his grades. For example, with distribution graphs for individual subjects or even for all subjects. In addition, the user is directly shown the average in each subject as well as the overall average. It is also taken into account that, for example, class tests have a larger percentage share in the final grade than other tests. However, the user can also freely configure this weighting.

### How does the extension work?
When the content of the page is loaded, the extension reads the subjects and grades and then inserts the analysis content. This happens in content.js.