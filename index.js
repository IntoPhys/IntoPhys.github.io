window.G = 6.67 * Math.pow(10,-11)* Math.pow(10, 11);
window.g_of_planets = {
    "TrueEarthequator": 9.8144,
    "EffectiveEarthequator": 9.7805,
    "Earthpole": 9.8322,
    "Moon": 1.62,
    "Venus": 8.88,
    "Jupiter": 24.79,
    "Uranus": 8.86,
    "Sun": 273.1,
    "Mercury": 3.7,
    "Mars": 3.86,
    "Saturn": 10.44,
    "Neptune": 11.09,
    "Pluto": 0.617
}
const wheelScaleFactor = 1.1;

decomp.quickDecomp = decomp.decomp;

Matter.Common.setDecomp(decomp);

window.contextMenu = document.getElementById("contextmenu");


class springBond {
    constructor(objectA, pointA, objectB, pointB, stiffness, length = undefined) {
        this.objectA = objectA;
        this.objectB = objectB;
        this.pointA = pointA;
        this.pointB = pointB;

        if (length) {
            this.length = length;
        } else {
            this.length = Matter.Vector.magnitude(Matter.Vector.sub(pointA, pointB));
        }

        this.force = new ElasticForce(this.objectA, this.pointA, this.objectB, this.pointB, stiffness, this);
        this.objectA.attachForce(this.force);
        this.objectB.attachForce(this.force);
        this.objectPositionDeltaA = Matter.Vector.rotate(Matter.Vector.sub(pointA, Matter.Vector.clone(objectA.getBody().position)), -objectA.getBody().angle);
        this.objectPositionDeltaB = Matter.Vector.rotate(Matter.Vector.sub(pointB, Matter.Vector.clone(objectB.getBody().position)), -objectB.getBody().angle);

        this.SVGImage = undefined;
    };

    update() {
        this.pointA = Matter.Vector.add(this.objectA.getBody().position, Matter.Vector.rotate(this.objectPositionDeltaA, this.objectA.getBody().angle));
        this.pointB = Matter.Vector.add(this.objectB.getBody().position, Matter.Vector.rotate(this.objectPositionDeltaB, this.objectB.getBody().angle));
    }

    setSVGImage(image){
        this.SVGImage = image;
    };
    getSVGImage(){
        return this.SVGImage;
    };
}

class ForceObjectBond{//Forces need to be added after adding to engine
    constructor(object, force, visualizer, visualize = true){
        this.object = object;
        this.force = force;
        this.visualizer = visualizer;
        this.visualize = visualize;

        this.SVGImage = undefined;
        this.visualized = false;
    };
    applyForce(override){
        if(!override){
            Matter.Body.applyForce(this.object.getBody(), this.applicationPoint, this.appliedForce);
            if(!this.visualized&this.visualize){
                this.visualizer.addForceVisual(this);
                this.visualized = true;
            };
        }else{
            Matter.Body.applyForce(override, this.applicationPoint, this.appliedForce);
            if(!this.visualized&this.visualize){
                this.visualizer.addForceVisual(this);
                this.visualized = true;
            }
        };
    };
    setForceApplied(applicationPoint, appliedForce){
        this.applicationPoint = applicationPoint;
        this.appliedForce = appliedForce;
    };
    recalculateForce(parametersToOverride){
        this.force.updateForce(this, parametersToOverride);
    };
    getForceApplied(){
        return [this.applicationPoint, this.appliedForce];
    };
    getObject(){
        return this.object;
    };
    getForce(){
        return this.force;
    };
    setSVGImage(image){
        this.SVGImage = image;
    };
    getSVGImage(){
        return this.SVGImage;
    };
    getVisuals(){
        return {strokeWidth: 1, strokeColor: "#00ff00"};
    };
    hide(){
        this.SVGImage.hide();
    };
    show(){
        this.SVGImage.show();
    };
    delete(){
        this.object.detachBond(this);
        this.force.detachBond(this);
        this.visualizer.removeForceVisual(this);
    };
};

//Forces
//Rewrite force system to ccount for cells
class Force{
    bonds = []//Why array
    attachObject(obj){
        this.visualizer = obj.visualizationBond.visualizer;
        let bond = new ForceObjectBond(obj, this, this.visualizer);
        this.bonds.push(bond);

        this.onCreation();

        this.force = Matter.Vector.create(0, 0);

        return bond;
    }
    detachBond(bond){
        let index = this.bonds.indexOf(bond);
        if (index != -1){
            this.bonds.splice(index, 1);
        };
    };
    detachObject(obj){
        for(i in this.bonds){
            if(this.bonds[i].getObject() === obj){
                this.bonds[i].delete();
            };
        };
    };
    updateForce(bond){
        bond.setForceApplied(bond.getObject().getBody().position, this.force);
    };
    unite(other){
        if(0){
            return true;
            this.onCreation();
        }
        return false;
    }
    onCreation(){
        this.visualizer.clearInputs();
    };
}

class ConstantForce extends Force{
    constructor(forceX, forceY){
        super();
        this.force = Matter.Vector.create(forceX, forceY);
    };
    updateForce(bond){
        bond.setForceApplied(bond.getObject().getBody().position, this.force);
    };
    onCreation(){
        super.onCreation()
        this.visualizer.addInput(
            this.visualizer.getFloatInput("Горизонтальная компонента силы(положительное направление - вправо), H", undefined, undefined, 0.01, this.force.x, (f) => {this.force.x = f})
        );
        this.visualizer.addInput(
            this.visualizer.getFloatInput("Вертикальная компонента силы(положительное направление - вверх), H", undefined, undefined, 0.01, -this.force.y, (f) => {this.force.y = -f})
        );
        this.visualizer.setTitle("Настройка постоянной силы");
    };
}

class CelestialGravity extends Force{
    constructor(celestialBody = "True Earth equator"){
        super();
        this.acceleration = Matter.Vector.create(0, window.g_of_planets[celestialBody]);
    };
    updateForce(bond){
        bond.setForceApplied(bond.getObject().getBody().position, Matter.Vector.mult(this.acceleration, bond.getObject().getBody().mass));
    };

    onCreation(){
        super.onCreation();
        let bottomElement = undefined;
        let element = this.visualizer.getListInput("Ускорение свободного падения", {
            "user": "Своё значение",
            "TrueEarthequator": "Земное на экваторе(без центробежной силы)",
            "EffectiveEarthequator": "Земное на экваторе(с центробежной силой)",
            "Earthpole": "Земное на полюсах",
            "Moon": "Луна",
            "Sun": "Солнце",
            "Mercury": "Меркурий",
            "Venus": "Венера",
            "Mars": "Марс",
            "Jupiter": "Юпитер",
            "Saturn": "Сатурн",
            "Uranus": "Уран",
            "Neptune": "Нептун",
            "Pluto": "Плутон"
        }, "user", (v) => {
            console.log(v);
            bottomElement.remove();
            if (v !== "user"){
                bottomElement = this.visualizer.getText("Ускорениие свободного падения - " + new String(window.g_of_planets[v]) + " м/с^2");
                this.acceleration.y = window.g_of_planets[v];
            }else{
                bottomElement = this.visualizer.getFloatInput("Ускорение свободного падения, м/с^2", 0, undefined, 0.01, this.acceleration.y, (f) => {this.acceleration.y = f})
            };
            bottomElement.insertAfter(element);
        })
        this.visualizer.addInput(element);
        bottomElement = this.visualizer.getFloatInput("Ускорение свободного падения, м/с^2", 0, undefined, 0.01, this.acceleration.y, (f) => {this.acceleration.y = f});
        this.visualizer.addInput(bottomElement);
        this.visualizer.setTitle("Настройка силы тяжести");
    };
}

class Gravity extends Force{
    constructor(){
        super();
    };
    updateForce(bond){
        let force = Matter.Vector.create(0, 0);
        for (let i in this.bonds){
            if (bond.getObject() != this.bonds[i].getObject()){
                let addForce = Matter.Vector.mult(
                    Matter.Vector.sub(this.bonds[i].getObject().getBody().position,
                        bond.getObject().getBody().position),
                    G*bond.getObject().getBody().mass*this.bonds[i].getObject().getBody().mass/
                    (Math.pow(Matter.Vector.magnitude(Matter.Vector.sub(this.bonds[i].getObject().getBody().position, bond.getObject().getBody().position)), 3))
                )
                force = Matter.Vector.add(force, addForce);
            }
        };
        bond.setForceApplied(bond.getObject().getBody().position, force);
    };
    unite(){
        return true;
    };
    onCreation(){
        super.onCreation();
        this.Ma = 6.67;
        this.p = -11;
        this.visualizer.addInput(
            this.visualizer.getFloatInput("Мантисса гравитационной постоянной(Н*м^2/(кг^2))", 0, 10, 0.01, this.Ma, (f) => {this.Ma=f;window.G = this.Ma * Math.pow(10,this.p)})
        );
        this.visualizer.addInput(
            this.visualizer.getFloatInput("Порядок величины гравитационной постоянной", undefined, undefined, 1, this.p, (f) => {this.p=f;window.G = this.Ma * Math.pow(10,this.p)})
        );
        this.visualizer.setTitle("Настройка силы гравитации");
    };
};

class ElasticForce extends Force{//Suitable only for 2 objects
    constructor(objectA, pointA, objectB, pointB, stiffness, spring, visualize = true){
        super();
        this.spring = spring;
        this.stiffness = stiffness;
        this.objectA = objectA; this.objectB = objectB;
        console.log(objectA.getBody().position);
        console.log(objectB.getBody().position);

        this.drawn = false;
        this.visualize = visualize;
    };
    updateForce(bond){
        this.spring.update();
        let force = this.spring.length - Matter.Vector.magnitude(Matter.Vector.sub(this.spring.pointA, this.spring.pointB));
        if(force === 0){
            if(bond.getObject() === this.objectA){
                var point = this.spring.pointA;
            }else{
                force = Matter.Vector.neg(force);
                var point = this.spring.pointB;
            };
            bond.setForceApplied(point, Matter.Vector.create(0, 0));
            return;
        };
        force = Matter.Vector.mult(Matter.Vector.sub(this.spring.pointA, this.spring.pointB),
            this.stiffness*force/(this.spring.length - force));
        if(bond.getObject() === this.objectA){
            var point = this.spring.pointA;
        }else{
            force = Matter.Vector.neg(force);
            var point = this.spring.pointB;
        };
        bond.setForceApplied(point, force);
        if(this.visualize&!this.drawn){
            //draw object TODO

        };
    };
    onCreation(){
        super.onCreation()
        this.visualizer.addInput(
            this.visualizer.getFloatInput("Жёсткость пружины, H/м", 0, undefined, 0.01, this.stiffness, (f) => {this.stiffness = f})
        );
        this.visualizer.setTitle("Настройка силы упругости");
    };
};

//phantoms
//Calculates net force
class PhantomForceObjectBond extends ForceObjectBond{
    constructor(object, force, visualizer, bondsToAverage){
        super(object, force, visualizer);
        this.applicationPoint = Matter.Vector.create(0,0);//TEMPORARY ADD AVERAGING
        this.appliedForce = Matter.Vector.create(0, 0);//TEMPORARY ADD AVERAGING
        this.visualizer.addForceVisual(this);
    };
    recalculateForce(){
        //A BIG TODO
    };
}

class PhantomParent{
    constructor(realObject){
        this.realObject = realObject;
        this.division = realObject.getDivision();
        this.phantoms = [];
        for(let i = 0; i < this.division.length; i++){
            let ph = new PhantomObject(this, i)
            ph.visualizationBond = {visualizer: this.realObject.visualizationBond.visualizer};
            this.phantoms.push(ph);
        };
    };
    update(){
        this.division = this.realObject.getDivision();
        for(let i in this.phantoms){
            this.phantoms[i].update();
        };
    };
    getDivision(){
        return this.division;
    }
    getPhantoms(){
        return this.phantoms;
    };
}

class PhantomObject{
    constructor(phantomParent, phantomIndex){
        this.phantomParent = phantomParent;
        this.phantomIndex = phantomIndex;
        this.mass = this.phantomParent.getDivision()[phantomIndex][2];
        this.position = Matter.Vector.create(
            (this.phantomParent.getDivision()[phantomIndex][0][0] + this.phantomParent.getDivision()[phantomIndex][1][0])/2,
            (this.phantomParent.getDivision()[phantomIndex][0][1] + this.phantomParent.getDivision()[phantomIndex][1][1])/2
        );
        this.charge = 0;
        this.bonds = [];
    };
    update(){
        this.position = Matter.Vector.create(
            (this.phantomParent.getDivision()[this.phantomIndex][0][0] + this.phantomParent.getDivision()[this.phantomIndex][1][0])/2,
            (this.phantomParent.getDivision()[this.phantomIndex][0][1] + this.phantomParent.getDivision()[this.phantomIndex][1][1])/2
        );
        this.mass = this.phantomParent.getDivision()[this.phantomIndex][2];
    };
    getBody(){
        return {position: this.position, mass: this.mass}
    };
    detachBond(bond){
    };
};

let physicalObjects = [];

//physical object
class PhysicalObject{
    constructor(x, y, data, extraOptions = {}, cellSize = [10, 10], divide = true){
        //{type: "polygon", sides: ..., radius: ...}
        //{type: "circle", radius: ...}
        //{type: "rectangle", width: ..., height: ...}
        //{type: "vertices", vertices: ...}
        // + data.angle

        this.rendererImage = undefined;
        this.visualizationBond = undefined;

        this.bonds = [];//Why array
        this.forces = [];

        this.cellSize = cellSize;
        this.cells = undefined;
        this.densityFunction = (u, v)=>{return 5};
        this.divisionPosition = undefined;//Matter.js vector
        this.divisionAngle = undefined;
        this.divisionForceAttached = false;

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
        physicalObjects.push(this);
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
        if(totalInertia !== 0){
            Matter.Body.setInertia(this.body, totalInertia);
        };
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
        Matter.Body.setCentre(this.body, Matter.Vector.create(CMx, CMy));
        this.divisionPosition = [CMx, CMy];
    };//
    getDivision(){
        if(!this.cells){
            return false;
        };
        let recalculatedCells = [];
        for(let c in this.cells){
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
        for(let i in this.forces){
            if(this.forces[i].constructor.name === force.constructor.name){
                if(this.forces[i].unite(force)){
                    this.forces[i].onCreation();
                    return;
                };
            };
        };
        this.forces.push(force);
        this.bonds.push(force.attachObject(this));
    };
    attachForceDivision(force){
        //let toAverage = [];
        for(let i in this.forces){
            if(this.forces[i].constructor.name === force.constructor.name){
                if(this.forces[i].unite(force)){
                    this.forces[i].onCreation();
                    return;
                };
            };
        };
        this.forces.push(force);
        for(let i in this.divisionPhantom.getPhantoms()){
            let newBond = force.attachObject(this.divisionPhantom.getPhantoms()[i])
            this.bonds.push(newBond);
            //toAverage.push(newBond);
        };
        //let averagingBond = new PhantomForceObjectBond(this, force, this.visualizationBond.visualizer, toAverage);
        //averagingBond.hide();
        //this.bonds.push(averagingBond);
        this.divisionForceAttached = true;//does not account for deleting forces
    };
    detachBond(bond){
        let index = this.bonds.indexOf(bond);
        if (index != -1){
            this.bonds.splice(index, 1);
        };
    };
    detachForce(force){
        let index = this.forces.indexOf(force);
        if (index != -1){
            this.forces.splice(index, 1);
        };
        for(let i in this.bonds){
            if(this.bonds[i].getForce() === force){
                this.bonds[i].delete();
            };
        };
    };
    getImages(force){
        let imgs = [];
        for(let i in this.bonds){
            if(this.bonds[i].getForce() === force){
                imgs.push(this.bonds[i].getSVGImage());
            };
        };
        return imgs;
    };
    updateForces(){//Rewrite
        if(this.divisionPhantom !== undefined & this.divisionForceAttached){//need a boost to performance
            this.divisionPhantom.update();
        };
        for (let i = 0; i < this.bonds.length; i++){
            this.bonds[i].recalculateForce();
            this.bonds[i].applyForce(this.getBody());
            //this.forces[i].applyForce(this);
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
        engine.SVGvisualizer.addObject(this);
        Matter.Events.trigger(engine, "objectAdded", {physicalObject: this, overridePolygon: overridePolygon})
        if(this.cells){
            this.divisionPhantom = new PhantomParent(this);
        };
    };
    setVisualizationBond(bond){
        this.visualizationBond = bond;
    }
    getBody(){
        return this.body;
    };
    delete(){
        for(let b in this.bonds){
            this.bonds[b].delete();
        };
        Matter.Composite.remove(engine.world, this.body);
        Matter.Events.trigger(engine, "objectDeleted", {physicalObject: this})
    };//

    onSelected(){
        let visualizer = this.visualizationBond.getVisualizer();
        visualizer.clearInputs();
        visualizer.addInput(
            visualizer.getFloatInput("Масса, кг", 0, undefined, 0.01, this.body.mass, (f) => {
                for(let i in this.cells){
                    this.cells[i][2] *= f/this.body.mass
                };
                Matter.Body.setMass(this.body, f);
            })
        );
        visualizer.addInput(
            visualizer.getFloatInput("Коэффициент трения покоя", 0, 1, 0.01, this.body.frictionStatic, (f) => {this.body.frictionStatic = f})
        );
        visualizer.addInput(
            visualizer.getFloatInput("Коэффициент трения скольжения", 0, 1, 0.01, this.body.friction, (f) => {this.body.friction = f})
        );
        visualizer.addInput(
            visualizer.getColorInput("Цвет объекта", this.opt.color , (f) => {this.opt.color = f;this.visualizationBond.recolor(f);})
        );
        visualizer.setTitle("Редактирование свойств объекта");

        if(this.forces.length > 0){
            visualizer.addInput(
                visualizer.getButton("Редактировать силы", ()=>{
                    visualizer.clearPopupInputs();
                    //Forces
                    for(let f = 0; f < this.forces.length; f++){
                        this.forces[f].onCreation();
                        let ttl = $("<div></div>").attr({
                            class: "property_menu"
                        }).css({
                            height: "12px",
                            display: "flex",
                            "flex-direction": "row",
                            "z-index": 5
                        }).append($("<label>" + visualizer.getTitle() + "</label>").css({
                            "font-size": "10px",
                            "align-self": "center",
                            "margin-left": "3px"
                        }))
                        visualizer.addPopupInput(ttl);
                        let objs = visualizer.getInputs().detach()
                        visualizer.addPopupInput(objs);
                        let imgs = this.getImages(this.forces[f]);
                        console.log(imgs[0].attr("stroke"));
                        let clr = visualizer.getColorInput("Цвет обозначения силы", imgs[0].attr("stroke"), (color) => {
                            for(let i in imgs){
                                imgs[i].attr({"stroke": color, "fill": color});
                                imgs[i].marker('end', 10, 10, function(add) {
                                    add.path('M 0 0 L 10 5 L 0 10 z').fill(color).stroke({ width: 1});
                                });
                            };
                        });
                        visualizer.addPopupInput(clr);
                        let btn = visualizer.getSmallButton("Удалить силу", ()=>{this.detachForce(this.forces[f]);btn.remove();ttl.remove();objs.remove();clr.remove()});
                        visualizer.addPopupInput(btn);
                    };
                    //End of discussing forcers
                    visualizer.addPopupInput(visualizer.getFloatInput("Размер сил", 0.1, 10, 0.1, visualizer.forceVisualsScale, (f) => {visualizer.forceVisualsScale = f}));
                    visualizer.addPopupInput(visualizer.addPopupInput(visualizer.getButton("Закрыть окно сил", ()=>{visualizer.closePopup();visualizer.clearPopupInputs();})));
                    visualizer.openPopup();
                    this.onSelected();
                })
            );
        };
    };

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

/*
Matter.Composite.add(engine.world, Matter.Constraint.create({
    pointA: { x: 0, y: 0 },
    bodyB: a.getBody(),
    length: 0,
    stiffness: 1
}));
*/
let btnlist = document.getElementsByClassName("actbtn");

window.paused = true;
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

let nav = new NavigationTool(renderSVG);
let sel_plus = new SelectionTool(renderSVG);
let sel_minus = new SelectionTool(renderSVG);
let spr = new SpringTool(renderSVG);
sel_minus.selectionMode = -1;
let cr_polygon = new PolygonCreationTool(renderSVG);
//Creating tool interface
const tagDataToolNameReferance = {
    "navigation": [nav],
    "selection": [sel_plus, sel_minus],
    "creation": [cr_polygon],
    "spring": [spr]
};
const selectedTools = {
    "navigation": 0,
    "selection": 0,
    "creation": 0,
    "spring": 0
};
const BRTolerance = [5, 5];//Determines how much space is provided to multitool selection in bottom right corner
const timeTolerance = 500;//Determines how much time
let toolButtons = $(".toolbtn");
toolButtons.css({
    "z-index": 4
});
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

nav.activate();
//cr_polygon.activate();

//examples
let exampleButtons = $(".exmp");
console.log(exampleButtons);

for(let i = 0; i < exampleButtons.length; i++){
    let btn = exampleButtons.eq(i);
    console.log("meow");
    btn.on("mouseup", (e)=>{
        console.log(btn.attr("id"));
        Matter.Engine.clear(engine);
        renderSVG.clear();
        for (let i in physicalObjects) {
            physicalObjects[i].delete();
        }
        if (btn.attr("id") == "exmp0") {
            examplePendulum(renderSVG);
        } else if (btn.attr("id") == "exmp3") {
            exampleEllipse(renderSVG);
        }
    })
};

//var lastUpdate = Date.now();
window.simulationLoop = setInterval(() => {
    //let now = Date.now();
    let dt = 0.005;//now - lastUpdate;
    //lastUpdate = now;
    Matter.Engine.update(engine, dt);
}, 5);