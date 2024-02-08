window.G = 6.67 * Math.pow(10,-11)* Math.pow(10, 11);
window.g_of_planets = {
    "True Earth equator": 9.8144,
    "Effective Earth equator": 9.7805,
    "True Earth pole": 9.8322,
    "Effective Earth pole": 9.8322
}
const wheelScaleFactor = 1.1;

decomp.quickDecomp = decomp.decomp;

Matter.Common.setDecomp(decomp);

window.contextMenu = document.getElementById("contextmenu");

//Rewrite force system to ccount for cells
class Force{
    objects = []//Why array
    attachObject(obj){
        this.objects.push(obj);
    }
    detachObject(obj){
        let index = this.objects.indexOf(obj);
        if (index != -1){
            this.objects.splice(index, 1);
        };
    };
    applyForce(obj){
    };
}

class ConstantForce extends Force{
    constructor(forceX, forceY){
        super();
        this.force = Matter.Vector.create(forceX, forceY);
    };
    applyForce(obj){
        Matter.Body.applyForce(obj.getBody(), obj.position, this.force);
    };
}

class CelestialGravity extends Force{
    constructor(celestialBody = "True Earth equator"){
        super();
        this.acceleration = Matter.Vector.create(0, window.g_of_planets[celestialBody]);
    };
    applyForce(obj){
        Matter.Body.applyForce(obj.getBody(), obj.position, Matter.Vector.mult(this.acceleration, obj.getBody().mass));
    };
}

class Gravity extends Force{//TODO: Add torque effect
    constructor(){
        super();
    };
    applyForce(obj){
        let force = Matter.Vector.create(0, 0);
        for (let i = 0; i < this.objects.length; i++){
            if (obj != this.objects[i]){
                let addForce = Matter.Vector.mult(Matter.Vector.sub(this.objects[i].getBody().position, obj.getBody().position),
                 G*obj.getBody().mass*this.objects[i].getBody().mass/(Math.pow(Matter.Vector.magnitude(Matter.Vector.sub(this.objects[i].getBody().position, obj.getBody().position)), 3))
                )
                force = Matter.Vector.add(force, addForce);
            }
        };
        return force;
    };
}

class PhysicalObject{
    constructor(x, y, data, extraOptions = {}, cellSize = [1, 1], divide = true){
        //{type: "polygon", sides: ..., radius: ...}
        //{type: "circle", radius: ...}
        //{type: "rectangle", width: ..., height: ...}
        //{type: "vertices", vertices: ...}
        // + data.angle

        this.rendererImage = undefined;
        this.visualizationBond = undefined;

        this.forces = [];//Why array

        this.cellSize = cellSize;
        this.cells = undefined;
        this.densityFunction = (u, v)=>{return 5};
        this.divisionPosition = undefined;//Matter.js vector
        this.divisionAngle = undefined;

        this.opt = {
            friction: 0,
            frictionStatic: 0,
            frictionAir: 0,
            density: 5,
            color: "#D3B0FF",
            opacity: 1
        };
        Object.assign(this.opt, extraOptions);
        if(data.type === "polygon"){
            this.body = Matter.Bodies.polygon(x, y, data.sides, data.radius, this.opt)
        };
        if(data.type === "circle"){
            this.body = Matter.Bodies.circle(x, y, data.radius, this.opt)
        };
        if(data.type === "rectangle"){
            this.body = Matter.Bodies.rectangle(x, y, data.width, data.height, this.opt)
        };
        if(data.type === "vertices"){
            this.body = Matter.Bodies.fromVertices(x, y, data.vertices, this.opt)
        };
        
        if(data.angle){
            Matter.Body.setAngle(this.body, data.angle)
        };
        this.body.parentalPhysicalObject = this;
        this.saveInitial();
        if(divide){
            this.divide();
            this.integrateDensity();
            this.recalculateCM();
            this.integrateInertia();
        };
    };
    
    divide(){
        let BB = Matter.Bounds.create(this.body.parts[0].vertices);
        let parts = this.body.parts;
        this.cells = [];
        for(let x = BB.min.x; x <= BB.max.x; x += this.cellSize[0]){
            for(let y = BB.min.y; y <= BB.max.y; y += this.cellSize[1]){
                if(parts.length === 1){
                    //convex
                    if(Matter.Vertices.contains(parts[0].vertices, Matter.Vector.create(x, y))&
                    Matter.Vertices.contains(parts[0].vertices, Matter.Vector.create(x + this.cellSize[0], y))&
                    Matter.Vertices.contains(parts[0].vertices, Matter.Vector.create(x, y + this.cellSize[1]))&
                    Matter.Vertices.contains(parts[0].vertices, Matter.Vector.create(x + this.cellSize[0], y + this.cellSize[1]))){
                        this.cells.push([[x, y], [x + this.cellSize[0], y + this.cellSize[1]], this.densityFunction ? this.cellSize[0]*this.cellSize[1]*this.densityFunction(2*(x + this.cellSize[0]/2 - (BB.max.x + BB.min.x)/2)/(BB.max.x - BB.min.x), 2*(y + this.cellSize[1]/2 - (BB.max.y + BB.min.y)/2)/(BB.max.y - BB.min.y)): undefined]);
                    };
                }else{
                    for(let i = 1; i < parts.length; i ++){//Not optimal
                        if(Matter.Vertices.contains(parts[i].vertices, Matter.Vector.create(x, y))&
                        Matter.Vertices.contains(parts[i].vertices, Matter.Vector.create(x + this.cellSize[0], y))&
                        Matter.Vertices.contains(parts[i].vertices, Matter.Vector.create(x, y + this.cellSize[1]))&
                        Matter.Vertices.contains(parts[i].vertices, Matter.Vector.create(x + this.cellSize[0], y + this.cellSize[1]))){
                            this.cells.push([[x, y], [x + this.cellSize[0], y + this.cellSize[1]], this.densityFunction ? this.cellSize[0]*this.cellSize[1]*this.densityFunction(2*(x + this.cellSize[0]/2 - (BB.max.x + BB.min.x)/2)/(BB.max.x - BB.min.x), 2*(y + this.cellSize[1]/2 - (BB.max.y + BB.min.y)/2)/(BB.max.y - BB.min.y)): undefined]);
                            break;//parts can't intersect
                        };
                    };
                    //concave
                };
            };
            this.divisionPosition = [this.body.position.x, this.body.position.y];
            this.divisionAngle = this.body.angle;
        };
        //Matter.Vertices.contains()
    };//TODO divides object into smaller parts
    integrateDensity(){
        let totalMass = 0;
        if (!this.cells){
            return false;
        };
        for(let i in this.cells){
            if(!this.cells[i][2]){
                return false;
            };
            totalMass += this.cells[i][2];
        };
        Matter.Body.setMass(this.body, totalMass);
    };//
    integrateInertia(){
        let totalInertia = 0;
        if (!this.cells){
            return false;
        };
        for(let i in this.cells){
            if(!this.cells[i][2]){
                return false;
            };
            totalInertia += this.cells[i][2]*Matter.Vector.magnitudeSquared(Matter.Vector.sub(Matter.Vector.create((this.cells[i][0][0] + this.cells[i][1][0])/2, (this.cells[i][0][1] + this.cells[i][1][1])/2), this.body.position));
        };
        Matter.Body.setInertia(this.body, totalInertia);
    };//
    recalculateCM(){
        if (!this.cells){
            return false;
        };
        let CMx = undefined;
        let CMy = undefined;
        for(let c in this.cells){
            if(CMx && CMy){
                CMx += ((this.cells[c][0][0] + this.cells[c][1][0])/2)*this.cells[c][2]/this.body.mass
                CMy += ((this.cells[c][0][1] + this.cells[c][1][1])/2)*this.cells[c][2]/this.body.mass
            }else{
                CMx = ((this.cells[c][0][0] + this.cells[c][1][0])/2)*this.cells[c][2]/this.body.mass
                CMy = ((this.cells[c][0][1] + this.cells[c][1][1])/2)*this.cells[c][2]/this.body.mass
            };
        };
        console.log(this.body.position);
        Matter.Body.setCentre(this.body, Matter.Vector.create(CMx, CMy));
        console.log(this.body.position);
        this.divisionPosition = [CMx, CMy];
    };//
    getDivision(){
        if(!this.cells){
            return false;
        };
        let recalculatedCells = [];
        for(c in this.cells){
            recalculatedCells.push([
                [this.body.position.x + (this.cells[c][0][0] - this.divisionPosition[0])*Math.cos(this.body.angle - this.divisionAngle) - (this.cells[c][0][1] - this.divisionPosition[1])*Math.sin(this.body.angle - this.divisionAngle),
                this.body.position.y + (this.cells[c][0][0] - this.divisionPosition[0])*Math.sin(this.body.angle - this.divisionAngle) + (this.cells[c][0][1] - this.divisionPosition[1])*Math.cos(this.body.angle - this.divisionAngle)],
                [this.body.position.x + (this.cells[c][1][0] - this.divisionPosition[0])*Math.cos(this.body.angle - this.divisionAngle) - (this.cells[c][1][1] - this.divisionPosition[1])*Math.sin(this.body.angle - this.divisionAngle),
                this.body.position.y + (this.cells[c][1][0] - this.divisionPosition[0])*Math.sin(this.body.angle - this.divisionAngle) + (this.cells[c][1][1] - this.divisionPosition[1])*Math.cos(this.body.angle - this.divisionAngle)]
            ,this.cells[c][2]]);
        };
        return recalculatedCells;
    };//Transforms divided topology
    attachForce(force){
        force.attachObject(this);
        this.forces.push(force);
    };
    detachForce(force){
        let index = this.forces.indexOf(force);
        if (index != -1){
            this.forces[index].detachObject(this);
            this.forces.splice(index, 1);
        };
    };
    updateForces(){
        for (let i = 0; i < this.forces.length; i++){
            this.forces[i].applyForce(this);
            this.body.torque = this.forces[i].getTorque(this);
        };
    };
    saveInitial(){
      this.initialState = {
          position: Matter.Vector.create(this.body.position.x, this.body.position.y),
          angle: this.body.angle,
          velocity: Matter.Body.getVelocity(this.body),
          angularVelocity: Matter.Body.getAngularVelocity(this.body),
      }  
    };
    returnToInitial(){
        if (this.initialState != undefined){
            Matter.Body.setPosition(this.body, this.initialState.position);
            Matter.Body.setAngle(this.body, this.initialState.angle);
            Matter.Body.setVelocity(this.body, this.initialState.velocity);
            Matter.Body.setAngularVelocity(this.body, this.initialState.angularVelocity)
        };
    }
    addToEngine(engine, overridePolygon = undefined){//can override polygon for visualization
        Matter.Events.on(engine, "afterUpdate", (event)=>{
            this.updateForces();
        });
        Matter.Events.on(engine, "returnToInitial",(event) => {
            this.returnToInitial();
        })
        Matter.Composite.add(engine.world, this.body);
        Matter.Events.trigger(engine, "objectAdded", {physicalObject: this, overridePolygon: overridePolygon})
    };
    setVisualizationBond(bond){
        this.visualizationBond = bond;
    }
    getBody(){
        return this.body;
    };
    delete(){
        for(let f in this.forces){
            this.detachForce(this.forces[f]);
        };
        Matter.Composite.remove(engine.world, this.body);
        Matter.Events.trigger(engine, "objectDeleted", {physicalObject: this})
    };//
};

// module aliases
var Engine = Matter.Engine;

$(document).on("contextmenu", (e)=>{e.preventDefault();});

window.engine = Engine.create();
engine.gravity.scale = 0;


var renderSVG = SVGRender.create({
    options: {
        width : "100%",
        height : "100%"
    },
    element: document.getElementById("main"),
    engine: engine,
});

var objectMananger = new ObjectMannager(engine);


let f = new Gravity();
objectMananger.addGlobalForce(f);
let a = new PhysicalObject(0, 0, {type: "polygon", sides:7, radius: 80});
let b = new PhysicalObject(300, 300, {type: "polygon", sides:3, radius: 20});
let c = new PhysicalObject(300, -300, {type: "polygon", sides:90, radius: 60});
a.addToEngine(engine);
b.addToEngine(engine);
c.addToEngine(engine);
//a.attachForce(f);

let btnlist = document.getElementsByClassName("actbtn");

window.paused = false;
window.pause = () => {
    window.paused = true;
    clearInterval(window.simulationLoop)
};

window.play = () => {//FIX SIMULATION LOOP
    var lastUpdate = Date.now();
    window.paused = false;
    window.simulationLoop = setInterval(() => {
        let now = Date.now();
        var dt = now - lastUpdate;
        lastUpdate = now;
        Matter.Engine.update(engine, dt/1000);
    }, 0); 
}

for (let btn of btnlist){
    btn.addEventListener("click", (event)=> {
        let action = event.target.getAttribute("data-action");
        if (action === "go-to-start"){
            Matter.Events.trigger(engine, "returnToInitial", {});
            Matter.Engine.update(engine, 0);
        }else if(action === "pause"){
            window.pause();
        }else if(action === "play"){
            window.play();
        };
    });
};

nav = new NavigationTool(renderSVG);
sel_plus = new SelectionTool(renderSVG);
sel_minus = new SelectionTool(renderSVG);
sel_minus.selectionMode = -1;
//cr_polygon = new PolygonCreationTool(renderSVG);
//Creating tool interface
const tagDataToolNameReferance = {
    "navigation": [nav],
    "selection": [sel_plus, sel_minus],
    //"creation": [cr_polygon]
};
const selectedTools = {
    "navigation": 0,
    "selection": 0,
    //"creation": 0
};
const BRTolerance = [5, 5];//Determines how much space is provided to multitool selection in bottom right corner
const timeTolerance = 500;//Determines how much time
let toolButtons = $(".toolbtn");
for(let i = 0; i < toolButtons.length; i++){
    let btn = toolButtons.eq(i);
    let tools = tagDataToolNameReferance[btn.attr("data-tool")];
    if (tools === undefined || tools.length === 0){
        continue;
    };
    btn.find(".toolicon").attr("src", tools[selectedTools[btn.attr("data-tool")]].getIcon()).attr("draggable", "false");
    let toolContainer = $("<div class = \"toolcontainer\"></div>");
    toolContainer.css({"top":btn.offset().top,"left":btn.offset().left + btn.width()});
    $(document).on("resize", ()=>{
        toolContainer.css({"top":btn.offset().top,"left":btn.offset().left + btn.width()});
    });
    btn.on("mousedown", (e)=>{
        if(e.originalEvent.button === 0){
            if(btn.width() - e.originalEvent.offsetX <= BRTolerance[0] && btn.height() - e.originalEvent.offsetY <= BRTolerance[1]){
                $(".toolbtn > .toolcontainer").hide();
                descriptions = toolContainer.find(".tooldescription");
                for (let i = 0;i < descriptions.length;i++){
                    if(i === selectedTools[btn.attr("data-tool")]){
                        descriptions.css("background-color", "#333333");
                        descriptions.eq(i).css("background-color", "#414141");
                    };
                };
                toolContainer.show();
            };
            btn.LMBClickTimeout = setTimeout(()=>{
                $(".toolbtn > .toolcontainer").hide();
                descriptions = toolContainer.find(".tooldescription");
                for (let i = 0;i < descriptions.length;i++){
                    if(i === selectedTools[btn.attr("data-tool")]){
                        descriptions.css("background-color", "#333333");
                        descriptions.eq(i).css("background-color", "#414141");
                    };
                };
                toolContainer.show();
            }, timeTolerance);
        };
        if(e.originalEvent.button === 2){
            $(".toolbtn > .toolcontainer").hide();
            descriptions = toolContainer.find(".tooldescription");
            for (let i = 0;i < descriptions.length;i++){
                if(i === selectedTools[btn.attr("data-tool")]){
                    descriptions.css("background-color", "#333333");
                    descriptions.eq(i).css("background-color", "#414141");
                };
            };
            toolContainer.show();
        };
    });
    btn.on("mouseup", (e)=>{
        if(e.originalEvent.button === 0 && btn.LMBClickTimeout){
            clearTimeout(btn.LMBClickTimeout);
            if (toolContainer.is(":hidden")){
                //activated if click has happened, but tool selection dialog has been activated
                $(".toolbtn > .toolicon").css("background-color", "#333333");
                btn.find(".toolicon").css("background-color", "#414141");
                tools[selectedTools[btn.attr("data-tool")]].activate();
            };
        }
    })
    for(let i = 0; i < tools.length; i++){
        let toolDescription = $(`
        <div class = "tooldescription">
            <img style = "width: 24px; height: 24px;" src = ${tools[i].getIcon()}>
            <p>${tools[i].getDescription()}</p>
        </div>`);
        toolContainer.append(toolDescription);
        toolDescription.on("click", () => {
            //TODO
            tools[i].activate();
            toolContainer.hide();
        });//selecting specific tool
        tools[i].on("activation", ()=>{
            $(".toolbtn > .toolicon").css("background-color", "#333333");
            btn.find(".toolicon").css("background-color", "#414141");
            $(".tooldescription").css("background-color", "#333333");
            toolDescription.css("background-color", "#414141");
            selectedTools[btn.attr("data-tool")] = i;
            btn.find(".toolicon").attr("src", tools[i].getIcon());
        });
    };
    toolContainer.on("mouseleave", ()=>{toolContainer.hide();});
    toolContainer.appendTo(btn);
    toolContainer.hide();
};

var lastUpdate = Date.now();
window.simulationLoop = setInterval(() => {
    let now = Date.now();
    let dt = now - lastUpdate;
    lastUpdate = now;
    Matter.Engine.update(engine, dt/1000);
}, 0);