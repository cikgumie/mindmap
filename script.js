// Set dimensions and margins
const margin = {top: 20, right: 120, bottom: 20, left: 120};
const width = 1160 - margin.right - margin.left;
const height = 660 - margin.top - margin.bottom;

let i = 0;
const duration = 750;
let root;
let zoom;

// Create tree layout
const tree = d3.tree().size([height, width]);

// Create SVG with zoom and pan functionality
const svg = d3.select("#mindmap")
    .attr("width", width + margin.right + margin.left)
    .attr("height", height + margin.top + margin.bottom)
    .call(zoom = d3.zoom()
        .scaleExtent([0.1, 4])
        .on("zoom", (event) => {
            g.attr("transform", event.transform);
        }))
    .on("dblclick.zoom", null); // Disable double-click zoom

const g = svg.append("g");

// Initialize
root = d3.hierarchy(treeData, d => d.children);
root.x0 = height / 2;
root.y0 = 0;

// Set initial view
resetView(); 
// Collapse nodes initially
root.children.forEach(collapse);
update(root);


function update(source) {
    // Compute new tree layout
    const treeData = tree(root);
    const nodes = treeData.descendants();
    const links = treeData.descendants().slice(1);

    // Normalize for fixed-depth
    nodes.forEach(d => d.y = d.depth * 180);

    // Update nodes
    const node = g.selectAll('g.node')
        .data(nodes, d => d.id || (d.id = ++i));

    // Enter new nodes
    const nodeEnter = node.enter().append('g')
        .attr('class', 'node')
        .attr("transform", d => "translate(" + source.y0 + "," + source.x0 + ")")
        .on('click', click);

    // Add Circle for the nodes
    nodeEnter.append('circle')
        .attr('class', 'node')
        .attr('r', 1e-6)
        .style("fill", d => d._children ? color(d.depth) : "#fff")
        .style("stroke", d => color(d.depth))
        .style("stroke-width", "3px");

    // Add labels for the nodes
    nodeEnter.append('text')
        .attr("dy", ".35em")
        .attr("x", d => d.children || d._children ? -13 : 13)
        .attr("text-anchor", d => d.children || d._children ? "end" : "start")
        .text(d => d.data.name)
        .style("font-size", "12px")
        .style("font-weight", d => d.depth <= 1 ? "bold" : "normal");

    // Update
    const nodeUpdate = nodeEnter.merge(node);

    // Transition to the proper position for the node
    nodeUpdate.transition()
        .duration(duration)
        .attr("transform", d => "translate(" + d.y + "," + d.x + ")");

    // Update the node attributes and style
    nodeUpdate.select('circle.node')
        .attr('r', 8)
        .style("fill", d => d._children ? color(d.depth) : "#fff")
        .attr('cursor', 'pointer');

    // Remove exiting nodes
    const nodeExit = node.exit().transition()
        .duration(duration)
        .attr("transform", d => "translate(" + source.y + "," + source.x + ")")
        .remove();

    nodeExit.select('circle')
        .attr('r', 1e-6);

    nodeExit.select('text')
        .style('fill-opacity', 1e-6);

    // Update links
    const link = g.selectAll('path.link')
        .data(links, d => d.id);

    // Enter new links
    const linkEnter = link.enter().insert('path', "g")
        .attr("class", "link")
        .attr('d', d => {
            const o = {x: source.x0, y: source.y0};
            return diagonal(o, o);
        })
        .style("stroke", "#ccc")
        .style("stroke-width", "2px")
        .style("fill", "none");

    // Update
    const linkUpdate = linkEnter.merge(link);

    // Transition back to the parent element position
    linkUpdate.transition()
        .duration(duration)
        .attr('d', d => diagonal(d, d.parent));

    // Remove exiting links
    link.exit().transition()
        .duration(duration)
        .attr('d', d => {
            const o = {x: source.x, y: source.y};
            return diagonal(o, o);
        })
        .remove();

    // Store the old positions for transition
    nodes.forEach(d => {
        d.x0 = d.x;
        d.y0 = d.y;
    });
}

// Creates a curved (diagonal) path from parent to the child nodes
function diagonal(s, d) {
    const path = `M ${s.y} ${s.x}
            C ${(s.y + d.y) / 2} ${s.x},
              ${(s.y + d.y) / 2} ${d.x},
              ${d.y} ${d.x}`;
    return path;
}

// Toggle children on click
function click(event, d) {
    // Prevent click event from propagating to the SVG's zoom handler
    event.stopPropagation(); 
    if (d.children) {
        d._children = d.children;
        d.children = null;
    } else {
        d.children = d._children;
        d._children = null;
    }
    update(d);
}

// Control functions
function resetView() {
    root.children.forEach(collapse);
    // Reset zoom and pan
    svg.transition().duration(750).call(
        zoom.transform,
        d3.zoomIdentity.translate(margin.left, margin.top).scale(1)
    );
    update(root);
}

function expandAll() {
    function expand(d) {
        if (d._children) {
            d.children = d._children;
            d._children = null;
        }
        if (d.children) {
            d.children.forEach(expand);
        }
    }
    expand(root);
    update(root);
}

function collapseAll() {
    collapse(root);
    update(root);
}

// Collapse helper function (recursive)
function collapse(d) {
    if (d.children) {
        d._children = d.children;
        d._children.forEach(collapse);
        d.children = null;
    }
}


// Zoom functions
function zoomIn() {
    svg.transition().duration(300).call(zoom.scaleBy, 1.5);
}

function zoomOut() {
    svg.transition().duration(300).call(zoom.scaleBy, 1 / 1.5);
}

// Download PDF function
function downloadPDF() {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('landscape', 'mm', 'a4');
    
    // Get SVG element and its current dimensions
    const svgElement = document.getElementById('mindmap');
    const svgWidth = svgElement.clientWidth;
    const svgHeight = svgElement.clientHeight;
    
    // Create a temporary clone of the SVG to reset its transform for rendering
    const clonedSvgNode = svgElement.cloneNode(true);
    d3.select(clonedSvgNode).select('g').attr('transform', null);
    const svgData = new XMLSerializer().serializeToString(clonedSvgNode);

    const canvas = document.createElement('canvas');
    canvas.width = svgWidth;
    canvas.height = svgHeight;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    const svgBlob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'});
    const url = URL.createObjectURL(svgBlob);
    
    img.onload = function() {
        // Fill white background on canvas
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        
        const imgData = canvas.toDataURL('image/png');
        
        // PDF metadata and title
        pdf.setFontSize(20);
        pdf.text('Mind Map API Markmap', 15, 20);
        
        // Image dimensions in PDF (A4 landscape: 297x210 mm)
        const pdfMargin = 15;
        const pdfPageWidth = pdf.internal.pageSize.getWidth();
        const pdfPageHeight = pdf.internal.pageSize.getHeight();
        const contentWidth = pdfPageWidth - 2 * pdfMargin;
        const contentHeight = pdfPageHeight - 2 * pdfMargin - 20; // Space for title
        
        const imgAspectRatio = canvas.width / canvas.height;
        let finalImgWidth = contentWidth;
        let finalImgHeight = finalImgWidth / imgAspectRatio;
        
        if (finalImgHeight > contentHeight) {
            finalImgHeight = contentHeight;
            finalImgWidth = finalImgHeight * imgAspectRatio;
        }
        
        const x = (pdfPageWidth - finalImgWidth) / 2;
        const y = pdfMargin + 20;

        pdf.addImage(imgData, 'PNG', x, y, finalImgWidth, finalImgHeight);
        
        // Footer
        pdf.setFontSize(8);
        pdf.setTextColor(150);
        pdf.text(`Generated on ${new Date().toLocaleDateString()}`, pdfMargin, pdfPageHeight - 10);
        
        pdf.save('markmap-api-mindmap.pdf');
    };
    
    img.src = url;
}
