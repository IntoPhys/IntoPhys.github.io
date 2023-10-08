window.objects = Array();
window.visualizations = Array();

class PointVisualization{
    constructor(obj, svg){
        this.computed = obj
        this.rendered = svg.circle(3).cx(this.computed.r.x).cy(this.computed.r.y);
    };
    render(){
        this.rendered.cx(this.computed.r.x).cy(this.computed.r.y);
    };
};

class VisualizationBond{
    constructor(obj, svg){
        if(obj instanceof PointMass){
            this.rendered = new PointVisualization(obj, svg);
        };
    };
    render(){
        this.rendered.render();
    };
};

class PointMass{
    constructor(m,x0,y0,u0x = 0, u0y = 0){
        this.r = new Vector(x0,y0);
        this.u = new Vector(u0x, u0y);
        this.a = new Vector(0, 0);
        this.F = new Vector(0, 0);
        this.m = m;
    };
    applyForce(forceVector){
        this.F.add(forceVector);
    };
    calculate(dt){
        this.a = Vector.mul(this.F, 1/this.m);
        this.r.add(Vector.add(Vector.mul(this.u, dt), Vector.mul(this.a, dt^2/2)));
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

function update(){
    for (let i = 0; i < window.objects.length; i++){
        window.objects[i].applyForce(new Vector(100, 0));
    };
    for (let i = 0; i < window.objects.length; i++){
        window.objects[i].calculate(window.dt);
    };
    visualize(window.objects);
};

window.dt = 0.0001
window.objects.push(new PointMass(1, 400, 400, -100, 0));

document.addEventListener('DOMContentLoaded', ()=>{
    window.canvas = SVG.find("#visualizer");
    setInterval(update,1000*window.dt)
});