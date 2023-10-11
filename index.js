window.objects = Array();
window.cycles = Array()

class Cycle{
    constructor(x0, x1, T){
        this.limits = [x0, x1];
        this.value = x0;
        this.T = T;
        this.t = 0;
        window.cycles.push(this);
    }
    tick(){
        this.value = this.limits[0] + (Math.sin(2*Math.PI*this.t/this.T) + 1)*(this.limits[1] - this.limits[0])/2;
        this.t += window.dt;
        if(this.t > this.T){
            this.t = this.t%this.T;
        };
    }
    getValue(){
        return this.value;
    }
}

class PointMass{
    constructor(m,x0,y0,u0x = 0, u0y = 0, _maxF = 100){
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
};

var firstTime = true
function visualize(obj){
    if(firstTime){
        firstTime = false;
        for (let i = 0; i < obj.length; i++){
            window.visualizations.push(new VisualizationBond(obj[i], window.canvas));//does not consider new elements
        };
    };
    for (let i = 0; i < window.visualizations.length; i++){
        window.visualizations[i].render();
    };
};

var c = new Cycle(300, 600, 0.1);
var c1 = new Cycle(300, 600, 0.4);
function update(){
    for (let i = 0; i < window.objects.length; i++){
        window.objects[i].applyForce(new Vector.mul(new Vector(c1.getValue(), c.getValue()).sub(window.objects[i].r), 1500));
    };
    for (let i = 0; i < window.objects.length; i++){
        window.objects[i].calculate(window.dt);
    };
    for (let i = 0; i < window.cycles.length; i++){
        window.cycles[i].tick();
    };
    visualize(window.objects);
};

window.dt = 0.0001
window.objects.push(new PointMass(1, 400, 400, maxF=100));

document.addEventListener('DOMContentLoaded', ()=>{
    window.canvas = SVG.find("#visualizer");
    setInterval(update,1000*window.dt)
});