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
    const width = 1000, height = 600;
    const marginLeft = 150, marginTop = 50;

    const svg = d3.select("#tree_svg")
        .attr("width", width + marginLeft * 2)
        .attr("height", height + 100);

    svg.selectAll("*").remove();

    const root = d3.hierarchy(data);


    const treeLayout = d3.tree()
        .size([width / 2, height - marginTop * 2]);
    treeLayout(root);

    const scaleX = d3.scaleLinear()
        .domain([0, width / 2])
        .range([0, width - marginLeft * 2]);

    const g = svg.append("g")
        .attr("transform", `translate(${marginLeft}, ${marginTop})`);

    // Links (paths)
    g.selectAll(".link")
        .data(root.links())
        .enter().append("path")
        .attr("class", "link")
        .attr("d", d3.linkVertical()
            .x(d => scaleX(d.x))
            .y(d => d.y))
        .style("stroke", "#ccc")
        .style("stroke-width", 2);

    // Nodes
    const nodes = g.selectAll(".node")
        .data(root.descendants())
        .enter().append("g")
        .attr("class", "node")
        .attr("transform", d => `translate(${scaleX(d.x)},${d.y})`);

    nodes.append("circle")
        .attr("r", 12)
        .style("fill", "steelblue")
        .style("stroke", "#333")
        .on("click", (_, d) => drawForceGraph(d))
        .on("mouseover", (event, d) => {
            d3.select(event.target).classed("highlighted", true);
            showTooltip(event, d);
        })
        .on("mouseout", (event) => {
            d3.select(event.target).classed("highlighted", false);
            hideTooltip();
        });

    nodes.append("text")
        .attr("dx", 15)
        .attr("dy", 5)
        .attr("transform", "rotate(45)")
        .style("font-size", "10px")
        .style("pointer-events", "none")
        .text(d => d.data.name.split(" ").pop());
}

// Tooltip Functions
function showTooltip(event, d) {
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("left", `${event.pageX + 10}px`)
        .style("top", `${event.pageY - 20}px`)
        .style("background", "lightgrey")
        .style("border", "1px solid black")
        .style("padding", "6px")
        .style("border-radius", "3px")
        .style("pointer-events", "none")
        .style("font-size", "12px")
        .html(`
            <strong>Full Name:</strong> ${d.data.name || "N/A"}<br>
            <strong>Metric:</strong> ${d.data.value || "N/A"}
        `);
}

function hideTooltip() {
    d3.select(".tooltip").remove();
}


function drawForceGraph(nodeData) {
    const width = 580, height = 400;

    const svg = d3.select("#forcegraph_svg")
        .attr("width", width)
        .attr("height", height);

    svg.selectAll("*").remove();

    const nodes = [];
    const links = [];

    nodes.push({ id: nodeData.data.name, value: nodeData.data.value, group: "parent" });

    if (nodeData.children || nodeData.data.children) {
        const children = nodeData.children || nodeData.data.children;
        children.forEach(child => {
            nodes.push({ id: child.data.name, value: child.data.value, group: "child" });
            links.push({ source: nodeData.data.name, target: child.data.name });
        });
    }

    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).distance(120))
        .force("charge", d3.forceManyBody().strength(-300))
        .force("center", d3.forceCenter(width / 2, height / 2));

    const link = svg.selectAll(".link")
        .data(links)
        .enter().append("line")
        .attr("class", "link")
        .style("stroke", "#ccc")
        .style("stroke-width", 2);

    const node = svg.selectAll(".force-node")
        .data(nodes)
        .enter().append("g")
        .attr("class", "force-node")
        .call(drag(simulation));

    node.append("circle")
        .attr("r", d => (d.group === "parent" ? 12 : 8))
        .style("fill", d => (d.group === "parent" ? "steelblue" : "orange"))
        .on("mouseover", (event, d) => {
            d3.select(event.target).classed("highlighted", true);
            showTooltip(event, d);
        })
        .on("mouseout", (event) => {
            d3.select(event.target).classed("highlighted", false);
            hideTooltip();
        });

    node.append("text")
        .attr("dy", -15)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text(d => d.id);

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

document.getElementById("loadDataBtn").addEventListener("click", () => {
    const file = document.getElementById("dataInput").files[0];
    if (file) loadData(file);
});
