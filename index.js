window.G = 6.67 * Math.pow(10,-11);
window.g_of_planets = {
    "True Earth equator": 9.8144,
    "Effective Earth equator": 9.7805,
    "True Earth pole": 9.8322,
    "Effective Earth pole": 9.8322
}
/*
window.G = 6.67 * Math.pow(10, -11);

class Simulation{
    static{
        if(window.simulations == undefined){
            window.simulations = [];
        };
    };
    constructor(visualizer, _dt=0.01){
        this.visualizer = visualizer
        this.visualizations = [];
        this.dt = _dt;
        this.objects = [];
        this.forces = [];
        this.cycles = [];
        window.simulations.push(this);
    }
    addForce(force){
        this.forces.push(force);
    };
    update(){
        for (let i = 0; i < this.forces.length; i++){
            this.forces[i].applyForce(this.objects);
        };
        for (let i = 0; i < this.objects.length; i++){
            this.objects[i].calculate(this.dt);
        };
        for (let i = 0; i < this.cycles.length; i++){
            this.cycles[i].tick();
        };
        this.visualize(this.objects);
    };
    push(obj){
        this.objects.push(obj);
        this.visualizations.push(new VisualizationBond(obj, this.visualizer));
    };
    visualize(){
    for (let i = 0; i < this.visualizations.length; i++){
        this.visualizations[i].render();
    };
    };
    kill(){
        this.simulations.splice(this.simulations.idexOf(this), 1);
    };
}

class Force{
    constructor(parent){
        this.parent = parent;
    }
    applyForce(obj){
    };
}

class ConstantForce extends Force{
    constructor(parent, _force = new Vector(0, 0)){
        super(parent);
        this.parent = parent;
        this.force = _force;
        console.log(this.force);
    }
    applyForce(obj){
        for (let i = 0; i < obj.length; i++){
                obj[i].applyForce(this.force);
        };
    };
}

class GlobalGravitationalForce extends Force{
    applyForce(obj){
        for (let i = 0; i < obj.length; i++){
            for (let j = 0; j < obj.length; j++){
                if(obj[i].GRAVITY && obj[j].GRAVITY && obj[i] != obj[j]){
                    obj[i].applyForce(Vector.mul(Vector.sub(obj[j].r, obj[i].r), window.G*obj[i].m*obj[j].m*Math.pow(Vector.len(Vector.sub(obj[j].r, obj[i].r)), -3)));
                }
            };
        };
    };
};

class LowSpeedViscousFrictionStillFluid extends Force{
    constructor(parent, k=0.01, objects = []){
        super(parent);
        this.k = k
        this.parent = parent;
        this.objects = objects;
    }
    applyForce(obj){
        if (this.objects.length == 0){
            for (let i = 0; i < obj.length; i++){
                obj[i].applyForce(Vector.mul(obj[i].u, -this.k));
            };
        }else{
            for (let i = 0; i < this.objects.length; i++){
                this.objects[i].applyForce(Vector.mul(this.objects[i].u, -this.k));
            };
        };
    };
}

class HighSpeedViscousFrictionStillFluid extends Force{
    constructor(parent, k=0.01, objects = []){
        super(parent);
        this.k = k
        console.log(this.k);
        this.parent = parent;
        this.objects = objects;
    }
    applyForce(obj){
        if (this.objects.length == 0){
            for (let i = 0; i < obj.length; i++){
                obj[i].applyForce(Vector.mul(obj[i].u, -this.k*Vector.len(obj[i].u)));
            };
        }else{
            for (let i = 0; i < this.objects.length; i++){
                this.objects[i].applyForce(Vector.mul(this.objects[i].u, -this.k*Vector.len(this.objects[i].u)));
            };
        };
    };
}

class Cycle{
    constructor(simulation, x0, x1, T){
        this.limits = [x0, x1];
        this.value = x0;
        this.T = T;
        this.t = 0;
        this.simulation = simulation;
        this.simulation.cycles.push(this);
    }
    tick(_dt){
        this.value = this.limits[0] + (Math.sin(2*Math.PI*this.t/this.T) + 1)*(this.limits[1] - this.limits[0])/2;
        this.t += _dt;
        if(this.t > this.T){
            this.t = this.t%this.T;
        };
    }
    getValue(){
        return this.value;
    }
    kill(){
        this.simulation.cycles.splice(this.simulation.cycles.idexOf(this), 1);
    };
}

class PointMass{
    constructor(simulation, m, x0, y0, u0x = 0, u0y = 0, _maxF = 100){
        this.GRAVITY = true;
        this.simulation = simulation
        this.r = new Vector(x0,y0);
        this.u = new Vector(u0x, u0y);
        this.a = new Vector(0, 0);
        this.F = new Vector(0, 0);
        this.m = m;
        this.maxF = _maxF;
    };
    applyForce(forceVector){
        this.F.add(forceVector);
    };
    calculate(dt){
        if (this.maxF){
            this.F.mul(this.maxF/Vector.len(this.F));
        };
        this.a = Vector.mul(this.F, 1/this.m);
        this.r.add(Vector.add(Vector.mul(this.u, dt), Vector.mul(this.a, dt*dt/2)));
        this.u.add(Vector.mul(this.a, dt));
        this.F.mul(0);
    };
    kill(){
        this.simulation.objects.splice(this.simulation.objects.idexOf(this), 1);
    };
};

document.addEventListener('DOMContentLoaded', ()=>{
    window.canvas = SVG.find("#visualizer");
    var s = new Simulation(window.canvas);
    for (let i = 0; i < 300; i=i+30){
        for (let j = 0; j < 300; j=j+30){
            s.push(new PointMass(s, 3, i, j));
        };
    };

    for (let i = 400; i < 500; i=i+15){
        for (let j = 400; j < 500; j=j+15){
            s.push(new PointMass(s, 1, i, j));
        };
    };

    s.addForce(new GlobalGravitationalForce(s));
    s.addForce(new LowSpeedViscousFrictionStillFluid(s, Math.pow(10, -14)));
    setInterval(()=>{s.update()},1)
});
*/

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
var Engine = Matter.Engine,
    //Render = Matter.Render,
    Runner = Matter.Runner;
// create an engine
window.engine = Engine.create();
engine.gravity.scale = 0;

// create a renderer

/*
var render = Render.create({
    options: {
        width : screen.width,
        height : screen.height
    },
    element: document.getElementById("main"),
    engine: engine,
});
*/



var renderSVG = SVGRender.create({
    options: {
        width : "100%",
        height : "100%"
    },
    element: document.getElementById("main"),
    engine: engine,
});

//let fl = true;
let f = new Gravity();
/*
for(let i = 10; i < 270; i = i + 80){
    for(let j = 10; j < 270; j = j + 80){
    let a = new PhysicalObject(i, j, {type: "polygon", sides: Math.round(3 + Math.random()*5), radius: 10, angle: Math.random()*360});
    if (Math.random() > 0.5){
        a = new PhysicalObject(i, j, {type: "vertices", vertices: Matter.Vertices.fromPath('50 0 63 38 100 38 69 59 82 100 50 75 18 100 31 59 0 38 37 38')});
    };
    if(Math.random() > 0.95 && fl){
        fl = false;
        Matter.Body.setMass(a.getBody(), 100);
        center = a.getBody();
    };
    a.addToEngine(engine);
    a.attachForce(f);
    };
};
*/

a = new PhysicalObject(0, 0, {type: "vertices", vertices: Matter.Vertices.fromPath('50 0 63 38 100 38 69 59 82 100 50 75 18 100 31 59 0 38 37 38')});
a.addToEngine(engine);
a.attachForce(f);

b = new PhysicalObject(500, 100, {type: "vertices", vertices: Matter.Vertices.fromPath('40 0 40 20 100 20 100 80 40 80 40 100 0 50')});
b.addToEngine(engine);
b.attachForce(f);

c = new PhysicalObject(100, 500, {type: "vertices", vertices: Matter.Vertices.fromPath('100 0 75 50 100 100 25 100 0 50 25 0')});
c.addToEngine(engine);
c.attachForce(f);

// run the renderer
//Render.run(render);

// create runner
//var runner = Runner.create();

//Developing Controls

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
            //console.log("paused");
            //runner.enabled = false;
        }else if(action === "play"){
            //runner.enabled = true;
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

//Creating window controls

console.log($("#main > SVG").eq(0));//JQUERY SVG ELEMENT

$("#simulation").on("mousedown", function (e) {
    window.mousePosition = [e.offsetX, e.offsetY];
    window.mouseDown = true;
    })
    .on("mousemove", function (e) {
        let mouseNewPosition = [e.offsetX, e.offsetY];
        if (window.mouseDown && window.changingCanvas && !window.changingArea) {
            for(let i = 0; i < window.simulationObjects.length; i++){
                simulationObjects[i].cx(simulationObjects[i].cx()[0] + mouseNewPosition[0] - window.mousePosition[0]);
                simulationObjects[i].cy(simulationObjects[i].cy()[0] + mouseNewPosition[1] - window.mousePosition[1]);
            };
        };
        window.mousePosition = mouseNewPosition;
    })
    .on("mouseup", function(){
        window.mouseDown = false;
    })
    .on("mousewheel", function(e){
        let mouseNewPosition = [e.offsetX, e.offsetY];
        window.mousePosition = mouseNewPosition;
        console.log(mousePosition)
        let scale = window.zoomIndex
        if (e.originalEvent.wheelDelta < 0){
            scale = 1/scale;
        };
        if (window.changingCanvas && !window.changingArea) {
            for(let i = 0; i < window.simulationObjects.length; i++){
                window.simulationObjects[i].size(scale*window.simulationObjects[i].width()[0], null);
                window.simulationObjects[i].cx(window.mousePosition[0] + scale*(window.simulationObjects[i].cx()[0] - window.mousePosition[0]));
                window.simulationObjects[i].cy(window.mousePosition[1] + scale*(window.simulationObjects[i].cy()[0] - window.mousePosition[1]));
            };
        };    
});

var lastUpdate = Date.now();
window.simulationLoop = setInterval(() => {
    let now = Date.now();
    let dt = now - lastUpdate;
    lastUpdate = now;
    Matter.Engine.update(engine, dt/1000);
}, 0);
//Matter.Render.lookAt(render, center);
// run the engine
//Runner.run(runner, engine);