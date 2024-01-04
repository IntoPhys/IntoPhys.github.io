window.G = 6.67 * Math.pow(10,-11);
window.g_of_planets = {
    "True Earth equator": 9.8144,
    "Effective Earth equator": 9.7805,
    "True Earth pole": 9.8322,
    "Effective Earth pole": 9.8322
}
const wheelScaleFactor = 1.1;

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
    visualizationBond = undefined;
    forces = []//Why array
    constructor(x, y, data, extraOptions = {}){
        //{type: "polygon", sides: ..., radius: ...}
        //{type: "circle", radius: ...}
        //{type: "rectangle", width: ..., height: ...}
        //{type: "vertices", vertices: ...}
        // + data.angle
        this.opt = {
            friction: 0,
            frictionStatic: 0,
            frictionAir: 0,
            density: 5
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


let f = new CelestialGravity();

a = new PhysicalObject(0, 0, {type: "vertices", vertices: Matter.Vertices.fromPath('50 0 63 38 100 38 69 59 82 100 50 75 18 100 31 59 0 38 37 38')});
a.addToEngine(engine);
a.attachForce(f);

b = new PhysicalObject(500, 100, {type: "vertices", vertices: Matter.Vertices.fromPath('40 0 40 20 100 20 100 80 40 80 40 100 0 50')});
b.addToEngine(engine);
b.attachForce(f);

c = new PhysicalObject(100, 500, {type: "vertices", vertices: Matter.Vertices.fromPath('100 0 75 50 100 100 25 100 0 50 25 0')});
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


sel = new SelectionTool(renderSVG);
sel.activate();

nav = new NavigationTool(renderSVG);
nav.activate();

$("#element to navigate").on("mousedown", (e) => {//Deactivated(moved to tools.js)
        if(e.originalEvent.button === 0){
            window.mouseDown = true;
        }
    })
    .on("mouseup", (e) => {
        if(e.originalEvent.button === 0){
            window.mouseDown = false;
        };
    })
    .on("mouseleave", (e) => {
        window.mouseDown = false;
    })
    .on("mousemove",  (e) => {
        if (window.mouseDown) {
            let dScreenX = window.mousePosition[0] - e.offsetX;
            let dScreenY = window.mousePosition[1] - e.offsetY;
            renderSVG.moveView(dScreenX, dScreenY);
        }
        window.mousePosition = [e.offsetX, e.offsetY];
    })
    .on("mousewheel", (e) => {
        setTimeout(()=>{
            if (e.originalEvent.wheelDelta < 0){
                renderSVG.scaleView(1/wheelScaleFactor, e.offsetX, e.offsetY);
            } else {
                renderSVG.scaleView(wheelScaleFactor, e.offsetX, e.offsetY);
            };
        }, 0);
    });

var lastUpdate = Date.now();
window.simulationLoop = setInterval(() => {
    let now = Date.now();
    let dt = now - lastUpdate;
    lastUpdate = now;
    Matter.Engine.update(engine, dt/1000);
}, 0);