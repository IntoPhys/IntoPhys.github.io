window.G = 6.67 * Math.pow(10,-11);
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

class Force{
    objects = []//Why array
    attachObject(obj){
        this.objects.push(obj);
    }
    getForce(obj){

    }
    getApplicationPoint(obj){
        return obj.getBody().position;
    }
}

class ConstantForce extends Force{
    constructor(forceX, forceY){
        super();
        this.force = Matter.Vector.create(forceX, forceY);
    };
    getForce(obj){
        return this.force;
    };
}

class CelestialGravity extends Force{
    constructor(celestialBody = "True Earth equator"){
        super();
        this.acceleration = Matter.Vector.create(0, window.g_of_planets[celestialBody]);
    };
    getForce(obj){
        return Matter.Vector.mult(this.acceleration, obj.getBody().mass);
    };
}

class Gravity extends Force{//TODO: Add torque effect
    constructor(){
        super();
    };
    getForce(obj){
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
    }
}

class PhysicalObject{
    constructor(x, y, data, extraOptions = {}){
        //{type: "polygon", sides: ..., radius: ...}
        //{type: "circle", radius: ...}
        //{type: "rectangle", width: ..., height: ...}
        //{type: "vertices", vertices: ...}
        // + data.angle

        this.visualizationBond = undefined;

        this.forces = [];//Why array

        this.opt = {
            friction: 0,
            frictionStatic: 0,
            frictionAir: 0,
            density: 5,
            color: "#D3B0FF",
            opacity: 1
        };
        Object.assign(this.opt, this.extraOptions);
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
    };
    attachForce(force){
        force.attachObject(this);
        this.forces.push(force);
    }
    updateForces(){
        for (let i = 0; i < this.forces.length; i++){
            Matter.Body.applyForce(this.body, this.forces[i].getApplicationPoint(this), this.forces[i].getForce(this));//Accounts for inverse coordinates
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
    addToEngine(engine){
        Matter.Events.on(engine, "afterUpdate", (event)=>{
            this.updateForces();
        });
        Matter.Events.on(engine, "returnToInitial",(event) => {
            this.returnToInitial();
        })
        Matter.Composite.add(engine.world, this.body);
        Matter.Events.trigger(engine, "objectAdded", {physicalObject: this})
    };
    setVisualizationBond(bond){
        this.visualizationBond = bond;
    }
    getBody(){
        return this.body;
    };
}

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


let f = new Gravity();

a = new PhysicalObject(0, 0, {type: "polygon", sides:7, radius: 80});
a.addToEngine(engine);
a.attachForce(f);

b = new PhysicalObject(500, 100, {type: "polygon", sides:9, radius: 10});
b.addToEngine(engine);
b.attachForce(f);

c = new PhysicalObject(100, 500, {type: "polygon", sides:3, radius: 30});
c.addToEngine(engine);
c.attachForce(f);

let btnlist = document.getElementsByClassName("actbtn");
for (let btn of btnlist){
    btn.addEventListener("click", (event)=> {
        let action = event.target.getAttribute("data-action");
        if (action === "go-to-start"){
            Matter.Events.trigger(engine, "returnToInitial", {});
            Matter.Engine.update(engine, 0);
        }else if(action === "pause"){
            if (window.simulationLoop){
                clearInterval(window.simulationLoop)
            };
        }else if(action === "play"){
            var lastUpdate = Date.now();
            window.simulationLoop = setInterval(() => {
                let now = Date.now();
                var dt = now - lastUpdate;
                lastUpdate = now;
                Matter.Engine.update(engine, dt/1000);
            }, 0);
        };
    });
};

nav = new NavigationTool(renderSVG);
sel_plus = new SelectionTool(renderSVG);
sel_minus = new SelectionTool(renderSVG);
sel_minus.selectionMode = -1;
//Creating tool interface
const tagDataToolNameReferance = {
    "navigation": [nav],
    "selection": [sel_plus, sel_minus]
};
const selectedTools = {
    "navigation": 0,
    "selection": 0
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