//TOOLS CAN NOT CONTAIN SIMILAR EVENT NAMESPACES
//HOTKEYS ARE NOT OPTIMAL
//HOTKEYS
//N, n - navigate
//S, s - select
//U, u - unselect
//C, c - create
//del resurved for deletion
class Tool{
    constructor (visualizer){
        this.visualizer = visualizer;
        this.visualizer.addTool(this);
        this.activationHandlers = [];
        this.deactivationHandlers = [];
    };
    getParameters(){//rudimentary
        return []
    };
    activate(){
        for(let i in this.activationHandlers){
            this.activationHandlers[i](this);
        };
    };
    deactivate(){
        for(let i in this.deactivationHandlers){
            this.deactivationHandlers[i](this);
        };
    };
    on(eventName, eventHandler){
        if(eventName === "activation"){
            if (eventHandler instanceof Function){
                this.activationHandlers.push(eventHandler);
            };
        }else if(eventName === "deactivation"){
            if (eventHandler instanceof Function){
                this.deactivationHandlers.push(eventHandler);
            };
        };
    };
    off(eventName, eventHandler){
        if(eventName === "activation"){
            let index = this.activationHandlers.indexOf(eventHandler);
            if (index != -1){
                this.activationHandlers.splice(index, 1);
            };
        }else if(eventName === "deactivation"){
            let index = this.deactivationHandlers.indexOf(eventHandler);
            if (index != -1){
                this.deactivationHandlers.splice(index, 1);
            };
        };
    };
    getIcon(){
        return "icons/tools/unknown.png";

    };
    getDescription(){
        return "No description yet";
    };
};
class NavigationTool extends Tool{
    constructor (visualizer){
        super(visualizer);
        this.mouseDown = false
        this.wheelScaleFactor = 1.1;//default value
        $(document).on("keyup", (e)=>{
            if (e.originalEvent.key === "n" || e.originalEvent.key === "N"){
                this.activate();
            };
        });
    };
    getParameters(){
        return [[(v) => {this.wheelScaleFactor = v}, "wheelScaleFactor (1;+inf)"],
        ]
    };
    activate(){
        this.visualizer.deactivateOtherTools(this);
        this.visualizer.getJQuery().on("mousedown.navigation", (e) => {
            if(e.originalEvent.button === 0){
                this.mouseDown = true;
            };
            this.mousePosition = [e.offsetX, e.offsetY];
        })
            .on("mouseup.navigation", (e) => {
                if(e.originalEvent.button === 0){
                    this.mouseDown = false;
                };
                this.mousePosition = [e.offsetX, e.offsetY];
            })
            .on("mouseleave.navigation", (e) => {
                this.mouseDown = false;
            })
            .on("mousemove.navigation",  (e) => {
                if (this.mouseDown) {
                    let doffsetX = this.mousePosition[0] - e.offsetX;
                    let doffsetY = this.mousePosition[1] - e.offsetY;
                    this.visualizer.moveView(doffsetX, doffsetY);
                }
                this.mousePosition = [e.offsetX, e.offsetY];
            })
            .on("mousewheel.navigation", (e) => {
                setTimeout(()=>{
                    if (e.originalEvent.wheelDelta < 0){
                        this.visualizer.scaleView(1/wheelScaleFactor, e.offsetX, e.offsetY);
                    } else {
                        this.visualizer.scaleView(wheelScaleFactor, e.offsetX, e.offsetY);
                    };
                }, 0);
            });
        super.activate();
    };
    deactivate(){
        super.deactivate();
        this.visualizer.getJQuery().off(".navigation");
    };
    getIcon(){
        return "./icons/tools/navigation.png";;
    };
    getDescription(){
        return "Инструмент для перемещения по рабочей области";
    };
};

class SelectionTool extends Tool{
    constructor (visualizer){
        super(visualizer);
        this.mouseDown = false
        this.clickTimestamp = undefined;
        this.selectionFrame = undefined;
        this.spaceTolerance = 5; //px - Default value(condition for insta click event)
        this.timeTolerance = 50; //ms - Default value(condition for insta click event)
        this.selectionMode = 1// + 1 - adds to selection; -1 - dletes from slection
        $(document).on("keyup", (e)=>{
            if (this.selectionMode === 1 && (e.originalEvent.key === "s" || e.originalEvent.key === "S")){
                this.activate();
            }else if (this.selectionMode === -1 && (e.originalEvent.key === "u" || e.originalEvent.key === "U")){
                this.activate();
            };
        });
    };
    getParameters(){
        return [[(v) => {this.spaceTolerance = v}, "spaceTolerance (0;+inf) px - Default value(condition for insta click event)"],
            [(v) => {this.timeTolerance = v}, "timeTolerance (0;+inf) ms - Default value(condition for insta click event)"],
            [(v) => {this.selectionMode = v}, "timeTolerance (0;+inf) ms - Default value(condition for insta click event)"],]
    };
    BBIntersection(TL1, BR1, TL2, BR2){
        let width = Math.max(BR1[0], BR2[0]) - Math.min(TL1[0], TL2[0]);
        let height =  Math.max(BR1[1], BR2[1]) - Math.min(TL1[1], TL2[1]);
        if ( (width <= (BR1[0] - TL1[0]) + (BR2[0] - TL2[0])) && (height <= (BR1[1] - TL1[1]) + (BR2[1] - TL2[1]))){
            return true;
        }else{
            return false;
        }
    };
    activate(){
        this.visualizer.deactivateOtherTools(this);
        //MOUSEUP OUTSIDE OF SVG BUG PRESENT
        this.visualizer.getJQuery().on("mousedown.selection", (e) => {
            this.clickTimestamp = e.timeStamp;
            if(e.originalEvent.button === 0){
                this.mouseDown = true;
            };
            this.mouseDownPosition = [e.offsetX, e.offsetY];
        })
            .on("mouseup.selection", (e) => {
                this.mouseDown = false;
                if(this.selectionFrame){
                    let BBTopLeft = [this.selectionFrame.attr("x"), this.selectionFrame.attr("y")];
                    let BBRightBottom = [BBTopLeft[0] + this.selectionFrame.attr("width"), BBTopLeft[1] + this.selectionFrame.attr("height")];
                    this.selectionFrame.remove();
                    this.selectionFrame = undefined;
                    let bonds = this.visualizer.getVisualizationBonds();
                    for (let i in bonds){
                        let bbox = bonds[i].getObjectImagePair().image.bbox();
                        if (this.BBIntersection(BBTopLeft, BBRightBottom, [bbox.x, bbox.y], [bbox.x2, bbox.y2])){
                            if(this.selectionMode === 1){
                                bonds[i].select();
                            }else if(this.selectionMode === -1){
                                bonds[i].unselect()
                            };
                        };
                    };
                }else{
                    let bonds = this.visualizer.getVisualizationBonds();
                    for (let i in bonds){
                        if (bonds[i].getObjectImagePair().image.inside(this.mouseDownPosition[0], this.mouseDownPosition[1])){
                            if(this.selectionMode === 1){
                                bonds[i].select();
                            }else if(this.selectionMode === -1){
                                bonds[i].unselect()
                            };
                        };//Does not consider parental position
                        //Can not be terminated, because considers only bounding boxes
                    };
                };
            })
            .on("mousemove.selection", (e) => {
                if (this.mouseDown && (e.timeStamp - this.clickTimestamp > this.timeTolerance && Math.hypot(e.offsetX - this.mouseDownPosition[0], e.offsetY - this.mouseDownPosition[1]) > this.spaceTolerance)){
                    if(! this.selectionFrame){
                        this.selectionFrame = this.visualizer.getSVGCanvas().rect(1, 1).fill('none').attr({
                            "stroke":"white",
                            "stroke-linecap":"round",
                            "stroke-width": 1,
                            "stroke-dasharray":"3,3"
                        }).move(this.mouseDownPosition[0], this.mouseDownPosition[1]);
                    };
                };
                if(this.mouseDown && this.selectionFrame){
                    this.selectionFrame.attr({
                        "x": Math.min(e.offsetX, this.mouseDownPosition[0]),
                        "y": Math.min(e.offsetY, this.mouseDownPosition[1]),
                        "height": Math.abs(e.offsetY - this.mouseDownPosition[1]),
                        "width": Math.abs(e.offsetX - this.mouseDownPosition[0]),
                    });
                };
            });
        super.activate();
    };
    deactivate(){
        super.deactivate();
        this.visualizer.getJQuery().off(".selection");
    };
    getIcon(){
        if (this.selectionMode === 1){
            return "./icons/tools/selection_plus.png";
        }else if (this.selectionMode === -1){
            return "./icons/tools/selection_minus.png";
        }else{
            return "./icons/tools/selection.png";
        }
    };
    getDescription(){
        if (this.selectionMode === 1){
            return "Выделить объект/объекты";
        }else if (this.selectionMode === -1){
            return "Снять выделение с объекта/объектов"
        };
    };
};

class PinPointTool{

};

class SpringTool extends Tool{
    constructor (visualizer){
        super(visualizer);

        this.style = {
            pointColor1: "aqua",
            pointColor2: "green",
            pointImpossibleColor: "red",
            pointSize: 5,
            pointCursorStroke: 1,
            lineSize: 3,
        };

        //Declaring special mouse cursor
        this.firstPointCreated = false;
        this.mousePosition = [0, 0];
        this.SVGMouse = this.visualizer.getSVGCanvas().circle(this.style.pointSize).fill("none").stroke({width: this.style.pointCursorStroke , color: this.pointColor1}).cx(this.mousePosition[0]).cy(this.mousePosition[1]);
        this.SVGMouse.hide();

        this.positionTolerance = [5, 5];//Tolerance of clicking a point
        this.pointASVG = undefined;

        this.objectA = undefined;
        this.objectB = undefined;

        this.visualizer.on("moveview", (dx, dy) => {this.movePoints(dx, dy)});
        this.visualizer.on("scaleview", (f, x, y) => {this.scalePoints(f, x, y)});
    };
    movePoints(dx, dy){
        if (this.pointASVG) {
            this.pointASVG.cx(this.pointASVG.cx() - dx);
            this.pointASVG.cy(this.pointASVG.cy() - dy);
        };
    };
    scalePoints(f, x, y){
        if (this.pointASVG) {
            this.pointASVG.cx(f*this.pointASVG.cx() + (1 - f)*x);
            this.pointASVG.cy(f*this.pointASVG.cy() + (1 - f)*y);
        };
    };

    intersectionPhysicalObject(physicalObject, line){//TODO, check if segment or polygon intersect, CCW polygon
        let objParts = physicalObject.getBody().parts;

        let lineVertices = Matter.Vertices.create([
            {x: this.visualizer.toSimulationCoordinates(line[0])[0], y: this.visualizer.toSimulationCoordinates(line[0])[1]},
            {x: this.visualizer.toSimulationCoordinates(line[1])[0], y: this.visualizer.toSimulationCoordinates(line[1])[1]},
        ],physicalObject.getBody());//far from optimal

        if(!Matter.Bounds.overlaps(Matter.Bounds.create(objParts[0].vertices),(Matter.Bounds.create(lineVertices)))){
            return false;
        };

        for (let i = 0; i < objParts.length; i++) {
            let objPartVertices = objParts[i].vertices;
            if (i === 0 && objParts.length > 1) {
                continue;
            };
            for (let j = 0; j < objPartVertices.length - 1; j++) {
                if (this.doIntersect([objPartVertices[j].x, objPartVertices[j].y], [objPartVertices[j + 1].x, objPartVertices[j + 1].y], this.visualizer.toSimulationCoordinates(line[0]), this.visualizer.toSimulationCoordinates(line[1]))){
                    return true;
                };
            };
            if (this.doIntersect([objPartVertices[0].x, objPartVertices[0].y], [objPartVertices.slice(-1)[0].x, objPartVertices.slice(-1)[0].y], this.visualizer.toSimulationCoordinates(line[0]), this.visualizer.toSimulationCoordinates(line[1]))){
                return true;
            };
        };
        return false;
    };

    pointPossible(point, addPoint = false){//the bug is here in assigning object b and a
        let objs = this.visualizer.getObjects();
        if(objs.length === 0){
            return true;
        };
        for(let i = 0; i < objs.length; i ++){
            let objParts = objs[i].getBody().parts;
            for(let j = 0; j < objParts.length; j ++){
                if(objParts.length > 1 & j === 0){
                    continue;
                };
                if(Matter.Vertices.contains(objParts[j].vertices, point)){
                    if(addPoint){
                        if(this.objectA === undefined){
                            this.objectA = objs[i];
                        }else {
                            this.objectB = objs[i];
                        };
                    };
                    return true;
                };
            };
        };
        return false;
    };
    activate(){
        this.visualizer.deactivateOtherTools(this);
        this.SVGMouse.show();
        this.visualizer.getJQuery().attr("cursor", "none");
        //MOUSEUP OUTSIDE OF SVG BUG PRESENT
        this.visualizer.getJQuery().on("mousemove.springcreation", (e) => {
            this.mousePosition = [e.offsetX, e.offsetY];
            this.SVGMouse.cx(this.mousePosition[0]).cy(this.mousePosition[1]);
            if(!this.pointPossible(this.visualizer.viewPointToWorld(this.mousePosition))){
                this.SVGMouse.stroke({color:this.style.pointImpossibleColor});
            }else{
                if(this.firstPointCreated){
                    this.SVGMouse.stroke({color:this.style.pointColor2});
                }else{
                    this.SVGMouse.stroke({color:this.style.pointColor1});
                };
            };
        })
            .on("mouseleave.springcreation", (e) => {
                this.SVGMouse.hide();
            }).on("mouseenter.springcreation", (e) => {
            this.SVGMouse.show();
        }).on("click.springcreation", (e) => {
            this.addPoint(e.offsetX, e.offsetY);
        });
        super.activate();
    };
    addPoint(x, y){
        if(this.pointPossible(this.visualizer.viewPointToWorld([x, y]), true)){
            if(this.firstPointCreated){
                //end drawing
                var pointA = this.visualizer.viewPointToWorld([this.pointASVG.cx(), this.pointASVG.cy()]);
                var pointB = this.visualizer.viewPointToWorld([x, y]);

                let spring = new springBond(this.objectA, pointA, this.objectB, pointB, 1000);
                this.visualizer.addSpringsVisuals(spring);

                this.pointASVG.remove();
                this.pointASVG = undefined;
                this.firstPointCreated = false;
                this.objectB = undefined;
                this.objectA = undefined;
                return;
            };
            this.pointASVG = this.visualizer.getSVGCanvas()
                .circle(this.style.pointSize)
                .fill({color: this.style.pointColor1})
                .stroke({width: this.style.pointCursorStroke , color: this.style.pointColor}).cx(x).cy(y);
            this.SVGMouse.stroke({width: this.style.pointCursorStroke , color: this.style.pointColor2});
            this.firstPointCreated = true;
        };
    };

    deactivate(){
        this.visualizer.getJQuery().attr("cursor", "default");
        super.deactivate();
        this.visualizer.getJQuery().off(".springcreation");
        this.SVGMouse.hide();
        if (this.pointASVG) {
            this.pointASVG.remove();
        };
        this.pointASVG = undefined;
        this.firstPointCreated = false;
    };
    getIcon(){
        return "./icons/tools/unknown.png";//TODO
    };
    getDescription(){
        return "Создаёт пружину между двумя объектами";
    };
};

class RodTool{

};

//TODO
//half-transparency

class PolygonCreationTool extends Tool{
    constructor (visualizer){
        super(visualizer);

        this.style = {
            pointColor: "white",
            pointImpossibleColor: "red",
            pointSize: 5,
            pointCursorStroke: 1,
            lineSize: 3,
            lineColor: "white",
            backgroundColor: "black",
            backgroundOpacity: 0.6
        };

        //Declaring background
        this.TopLeft = [0, 0];
        this.BottomRight = [0, 0];
        this.SVGBackground = this.visualizer.getSVGCanvas().rect(0, 0).fill({color: this.style.backgroundColor, opacity: this.style.backgroundOpacity}).stroke("none");
        this.SVGBackground.hide();

        //Declaring special mouse cursor
        this.mousePosition = [0, 0];
        this.SVGMouse = this.visualizer.getSVGCanvas().circle(this.style.pointSize).fill("none").stroke({width: this.style.pointCursorStroke , color: this.pointColor}).cx(this.mousePosition[0]).cy(this.mousePosition[1]);
        this.SVGMouse.hide();

        this.isCreating = false;
        this.positionTolerance = [5, 5];//Tolerance of clicking a point
        this.points = [];
        this.pointsSVG = [];
        this.lines = [];
        $(document).on("keyup", (e)=>{
            if (e.originalEvent.key === "c" || e.originalEvent.key === "C"){
                this.activate();
            };
        });
        this.visualizer.on("moveview", (dx, dy) => {this.movePoints(dx, dy)});
        this.visualizer.on("scaleview", (f, x, y) => {this.scalePoints(f, x, y)});
    };
    movePoints(dx, dy){
        for(let i = 0; i < this.lines.length; i ++){
            this.lines[i].cx(this.lines[i].cx() - dx);
            this.lines[i].cy(this.lines[i].cy() - dy);
        };
        for(let i = 0; i < this.points.length; i ++){
            this.points[i][0] -= dx;
            this.points[i][1] -= dy;
        };
        for(let i = 0; i < this.pointsSVG.length; i ++){
            this.pointsSVG[i].cx(this.pointsSVG[i].cx() - dx);
            this.pointsSVG[i].cy(this.pointsSVG[i].cy() - dy);
        };
    };
    scalePoints(f, x, y){
        for(let i = 0; i < this.lines.length; i ++){//UNOPTIMIZED
            this.lines[i].attr({
                "x1":f*this.lines[i].attr("x1") + (1 - f)*x,"y1":f*this.lines[i].attr("y1") + (1 - f)*y,
                "x2":f*this.lines[i].attr("x2") + (1 - f)*x,"y2":f*this.lines[i].attr("y2") + (1 - f)*y
            });
        };
        for(let i = 0; i < this.points.length; i ++){
            this.points[i][0] = f*this.points[i][0] + (1 - f)*x;
            this.points[i][1] = f*this.points[i][1] + (1 - f)*y;
        };
        for(let i = 0; i < this.pointsSVG.length; i ++){
            this.pointsSVG[i].cx(f*this.pointsSVG[i].cx() + (1 - f)*x);
            this.pointsSVG[i].cy(f*this.pointsSVG[i].cy() + (1 - f)*y);
        };
    };

    intersectionPhysicalObject(physicalObject, line){//TODO, check if segment or polygon intersect, CCW polygon
        let objParts = physicalObject.getBody().parts;

        let lineVertices = Matter.Vertices.create([
            {x: this.visualizer.toSimulationCoordinates(line[0])[0], y: this.visualizer.toSimulationCoordinates(line[0])[1]},
            {x: this.visualizer.toSimulationCoordinates(line[1])[0], y: this.visualizer.toSimulationCoordinates(line[1])[1]},
        ],physicalObject.getBody());//far from optimal

        if(!Matter.Bounds.overlaps(Matter.Bounds.create(objParts[0].vertices),(Matter.Bounds.create(lineVertices)))){
            return false;
        };

        for (let i = 0; i < objParts.length; i++) {
            let objPartVertices = objParts[i].vertices;
            if (i === 0 && objParts.length > 1) {
                continue;
            };
            for (let j = 0; j < objPartVertices.length - 1; j++) {
                if (this.doIntersect([objPartVertices[j].x, objPartVertices[j].y], [objPartVertices[j + 1].x, objPartVertices[j + 1].y], this.visualizer.toSimulationCoordinates(line[0]), this.visualizer.toSimulationCoordinates(line[1]))){
                    return true;
                };
            };
            if (this.doIntersect([objPartVertices[0].x, objPartVertices[0].y], [objPartVertices.slice(-1)[0].x, objPartVertices.slice(-1)[0].y], this.visualizer.toSimulationCoordinates(line[0]), this.visualizer.toSimulationCoordinates(line[1]))){
                return true;
            };
        };
        return false;
    };

    samePoint(p, q){
        if(Math.abs(p[0] - q[0]) <= this.positionTolerance[0] && Math.abs(p[1] - q[1]) <= this.positionTolerance[1]){
            return true;
        };
        return false;
    };

    onSegment(p, q, r) {
        if (q[0] <= Math.max(p[0], r[0]) && q[0] >= Math.min(p[0], r[0]) && q[1] <= Math.max(p[1], r[1]) && q[1] >= Math.min(p[1], r[1])){
            return true
        };

        return false;
    }

    // To find orientation of ordered triplet (p, q, r).
    // The function returns following values
    // 0 --> p, q and r are collinear
    // 1 --> Clockwise
    // 2 --> Counterclockwise
    orientation(p, q, r) {
        let val = (q[1] - p[1]) * (r[0] - q[0]) -
            (q[0] - p[0]) * (r[1] - q[1]);

        if (val === 0){
            return 0
        }; // collinear

        if(val > 0){
            return 1;
        }else{
            return 2;
        };
    };

    //returns if p1q1 and p2q2
    doIntersect(p1, q1, p2, q2){

        let o1 = this.orientation(p1, q1, p2);
        let o2 = this.orientation(p1, q1, q2);
        let o3 = this.orientation(p2, q2, p1);
        let o4 = this.orientation(p2, q2, q1);

        // General case
        if (o1 != o2 && o3 != o4){
            return true
        };

        // Special Cases
        // p1, q1 and p2 are collinear and p2 lies on segment p1q1
        if (o1 == 0 && this.onSegment(p1, p2, q1)){
            return true;
        };

        if (o2 == 0 && this.onSegment(p1, q2, q1)){
            return true;
        };

        if (o3 == 0 && this.onSegment(p2, p1, q2)){
            return true;
        };

        if (o4 == 0 && this.onSegment(p2, q1, q2)){
            return true;
        };

        return false;
    }

    pointPossible(point){
        //add checking other objects
        //does not account for placing initial point inside of any object

        if(this.points.length >= 1){
            let obj = this.visualizer.getObjects();
            for(let i = 0; i < obj.length; i ++){
                if(this.intersectionPhysicalObject(obj[i], [point, [this.points.slice(-1)[0][0], this.points.slice(-1)[0][1]]])){
                    return false;
                };
            };
        };

        if(this.points.length > 1){
            var p1 = point;
            var q1 = [this.points.slice(-1)[0][0], this.points.slice(-1)[0][1]]
        };

        for(let i = 0; i < this.points.length - 2; i++){//because segment to create is bound to last point
            if(this.points[i][0] == point[0] && this.points[i][1] == point[1] && !(i === 0 && this.points.length >= 3)){
                return false;
            };
            if(this.doIntersect(p1, q1, this.points[i], this.points[i + 1])){
                return false;
            };
        };

        for(let i = Math.max(0, this.points.length - 2); i < this.points.length; i++){//Needs refactoring
            if(this.samePoint(this.points[i], point) && !(i === 0 && this.points.length >= 3)){
                return false;
            };
        };

        return true;
    };
    activate(){
        this.wasPaused = window.paused;//from index.js
        window.pause();//from index.js

        this.visualizer.deactivateOtherTools(this);
        this.SVGMouse.show();
        this.visualizer.getJQuery().attr("cursor", "none");
        //MOUSEUP OUTSIDE OF SVG BUG PRESENT
        this.visualizer.getJQuery().on("mousedown.polygoncreation", (e) => {
        })
            .on("mouseup.polygoncreation", (e) => {
            })
            .on("mousemove.polygoncreation", (e) => {
                this.mousePosition = [e.offsetX, e.offsetY];
                this.SVGMouse.cx(this.mousePosition[0]).cy(this.mousePosition[1]);
                if(!this.pointPossible([this.mousePosition[0], this.mousePosition[1]])){
                    this.SVGMouse.stroke({color:this.style.pointImpossibleColor});
                }else{
                    this.SVGMouse.stroke({color:this.style.pointColor});
                };
            })
            .on("mouseleave.polygoncreation", (e) => {
                this.SVGMouse.hide();
            }).on("mouseenter.polygoncreation", (e) => {
            this.SVGMouse.show();
        }).on("click.polygoncreation", (e) => {
            this.addPoint(e.offsetX, e.offsetY);
        });
        super.activate();
    };
    addPoint(x, y){
        if(this.pointPossible([x, y])){
            if(this.points.length >= 3 && this.samePoint(this.points[0], [x, y])){
                this.endDrawing();//Adding point needs to be terminated
                return
            };
            if (this.points.length >= 1){
                this.lines.push(this.visualizer.getSVGCanvas().line(
                    this.points.slice(-1)[0][0], this.points.slice(-1)[0][1],
                    x, y
                ).stroke({width: this.style.lineSize , color: this.style.lineColor}));
            };
            this.points.push([x, y]);
            this.pointsSVG.push(this.visualizer.getSVGCanvas().circle(this.style.pointSize).fill({color: this.style.pointColor}).stroke({width: this.style.pointCursorStroke , color: this.style.pointColor}).cx(x).cy(y));
        };
    };
    isPolygonPossible(){//checks if polygon comprises other physical objects
        //rewrite
        let objs = this.visualizer.getObjects();
        if(objs.length === 0){
            return true;
        };

        let polygonVerticesArray = [];

        for(let i = 0; i < this.points.length; i++){
            polygonVerticesArray.push({x: this.visualizer.toSimulationCoordinates(this.points[i])[0], y: this.visualizer.toSimulationCoordinates(this.points[i])[1]});
        };
        //FIX CLOCKWISE SORT
        let polygonVertices = Matter.Vertices.clockwiseSort(Matter.Vertices.create(polygonVerticesArray,objs[0].getBody()));//far from optimal

        for(let i = 0; i < objs.length; i ++){
            let objParts = objs[i].getBody().parts;
            if(objParts.length > 1){
                if(Matter.Vertices.contains(polygonVertices, objParts[1].vertices[0])){
                    return false;
                };//concave
            }else{
                if(Matter.Vertices.contains(polygonVertices, objParts[0].vertices[0])){
                    return false;
                };//convex
            };
        };
        return true;
    };
    endDrawing(){
        //check if intersects with other objects
        if(this.isPolygonPossible()){
            let polygonVerticesArray = [];
            for(let i = 0; i < this.points.length; i++){
                polygonVerticesArray.push({x: this.visualizer.toSimulationCoordinates(this.points[i])[0], y: this.visualizer.toSimulationCoordinates(this.points[i])[1]});
            };
            //FIX CLOCKWISE SORT
            //BUGGY DUE TO SCALE
            //CONVERTION TO SIMULATION COORDINATES WORKS FINE

            let polygonVertices = Matter.Vertices.create(/*Matter.Vertices.clockwiseSort(*/polygonVerticesArray/*)*/, this.visualizer.getObjects()[0]);//far from optimal
            let obj = new PhysicalObject(0, 0, {type: "vertices", vertices: polygonVertices});
            let newBounds = obj.getBody().bounds;
            let oldBounds = Matter.Bounds.create(polygonVertices);
            obj.addToEngine(this.visualizer.engine, undefined);
            Matter.Body.setPosition(obj.getBody(), Matter.Vector.create(obj.getBody().position.x + oldBounds.min.x - newBounds.min.x, obj.getBody().position.y + oldBounds.min.y - newBounds.min.y));
            //console.log(obj.getBody().parts);

            //Test
            //for(let j in obj.getBody().parts){
            //    for(let i in obj.getBody().parts[j].vertices){
            //        let vect = obj.getBody().parts[j].vertices[i];
            //        console.log(vect);
            //        let obj1 = new PhysicalObject(vect.x, vect.y, {type: "circle", radius: 3});
            //        obj1.addToEngine(this.visualizer.engine);
            //        this.visualizer.update();
            //    };
            //};
            //Test1

            this.visualizer.update();
            obj.saveInitial();

            //Test
            //for(let j in polygonVerticesArray){
            //console.log(j);
            //let obj = new PhysicalObject(polygonVerticesArray[j].x, polygonVerticesArray[j].y, {type: "polygon", sides:7, radius: 3});
            //obj.addToEngine(this.visualizer.engine);
            //};
            //this.visualizer.update();
            //ENDTest
        }else{
            //Make failed drawing notificaqtion
        };
        this.points = [];
        for(let i = 0; i < this.lines.length; i++){
            this.lines[i].remove();
        };
        for(let i = 0; i < this.pointsSVG.length; i++){
            this.pointsSVG[i].remove();
        };
        this.lines = [];
        this.pointsSVG = [];
    };
    addToVisualizer(){
        return false;//TODO
    };
    deactivate(){
        if(!this.wasPaused){
            window.play();//from index.js
        };
        this.visualizer.getJQuery().attr("cursor", "default");
        super.deactivate();
        this.visualizer.getJQuery().off(".polygoncreation");
        this.SVGMouse.hide();
    };
    getIcon(){
        return "./icons/tools/unknown.png";//TODO
    };
    getDescription(){
        return "Создание объекта по точкам";
    };
}
