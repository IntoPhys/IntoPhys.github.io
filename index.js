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