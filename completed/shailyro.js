let hierData = null;

function loadData(file) {
    d3.csv(URL.createObjectURL(file)).then(data => {
        hierData = {
            name: "All Companies",
            children: Array.from(
                d3.group(data, d => d.Company),
                ([key, values]) => ({
                    name: key,
                    children: Array.from(
                        d3.group(values, d => d.Department),
                        ([dept, employees]) => ({
                            name: dept,
                            children: employees.map(e => ({ name: e.Name, value: +e.Metric }))
                        })
                    )
                })
            )
        };
        drawTreeLayout(hierData);
    });
}



function drawTreeLayout(data) {
    const width = 580, height = 400;

    const svg = d3.select("#tree_svg").attr("width", width).attr("height", height);
    svg.selectAll("*").remove();

    const root = d3.hierarchy(data);
    const treeLayout = d3.tree().size([width - 100, height - 100]);
    treeLayout(root);

    const g = svg.append("g").attr("transform", "translate(50,50)");

    g.selectAll(".link")
        .data(root.links())
        .enter().append("path")
        .attr("class", "link")
        .attr("d", d3.linkVertical()
            .x(d => d.x)
            .y(d => d.y));

    const nodes = g.selectAll(".node")
        .data(root.descendants())
        .enter().append("g")
        .attr("class", "node")
        .attr("transform", d => `translate(${d.x},${d.y})`);

    // Append circles
    nodes.append("circle")
        .attr("r", 6)
        .on("click", (_, d) => drawForceGraph(d))
        .on("mouseover", showTooltip) // Tooltip on hover
        .on("mouseout", hideTooltip);

    // Append last names
    nodes.append("text")
        .attr("dx", 8) // Shift text slightly to the right
        .attr("dy", 10) // Adjust for text height
        .attr("transform", "rotate(45)") // Rotate 45 degrees
        .text(d => d.data.name.split(" ").pop()); // Extract last name
}

// Tooltip functions
function showTooltip(event, d) {
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("left", `${event.pageX + 10}px`)
        .style("top", `${event.pageY}px`)
        .style("background", "lightgrey")
        .style("border", "1px solid black")
        .style("padding", "6px")
        .style("border-radius", "3px")
        .style("pointer-events", "none")
        .text(`Full Name: ${d.data.name}`); // Show full name
}

function hideTooltip() {
    d3.select(".tooltip").remove();
}


function drawForceGraph(nodeData) {
    const employees = nodeData.data.children || nodeData.data.children?.flatMap(d => d.children);
    if (!employees) return;

    const width = 580, height = 400;

    const svg = d3.select("#forcegraph_svg").attr("width", width).attr("height", height);
    svg.selectAll("*").remove();

    const nodes = employees.map(d => ({ id: d.name, value: d.value }));
    const links = nodes.map((_, i) => i > 0 ? { source: nodes[0].id, target: nodes[i].id } : null).filter(Boolean);

    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).distance(100))
        .force("charge", d3.forceManyBody().strength(-50))
        .force("center", d3.forceCenter(width / 2, height / 2));

    const link = svg.selectAll(".link")
        .data(links)
        .enter().append("line")
        .attr("class", "link");

    const node = svg.selectAll(".force-node")
        .data(nodes)
        .enter().append("g")
        .attr("class", "force-node")
        .call(drag(simulation));

    node.append("circle").attr("r", 8);
    node.append("text").text(d => d.id).attr("dy", -10).attr("text-anchor", "middle");

    simulation.on("tick", () => {
        link.attr("x1", d => d.source.x).attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x).attr("y2", d => d.target.y);

        node.attr("transform", d => `translate(${d.x},${d.y})`);
    });
}

function drag(simulation) {
    return d3.drag()
        .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        })
        .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
        })
        .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        });
}

function showTooltip(event, d) {
    const tooltip = d3.select("body").append("div").attr("class", "tooltip");
    tooltip.style("left", `${event.pageX + 10}px`).style("top", `${event.pageY}px`);
    tooltip.html(`Name: ${d.data.name}`);
}

function hideTooltip() {
    d3.select(".tooltip").remove();
}

document.getElementById("loadDataBtn").addEventListener("click", () => {
    const fileInput = document.getElementById("dataInput");
    if (fileInput.files.length) {
        loadData(fileInput.files[0]);
    }
});
