//contains default settings for creating objects
//attaches forces
class ObjectMannager{
    constructor (engine){
        this.globalForces = [];
        this.engine = engine;
        this.objects = [];
        Matter.Events.on(this.engine, "objectAdded", (event)=>{
            this.objects.push(event.physicalObject);
            for(let f in this.globalForces){
                event.physicalObject.attachForce(this.globalForces[f]);
            };
        });
        Matter.Events.on(engine, "collisionStart", (pairs)=>{});//used for elsastic collisions
        Matter.Events.on(engine, "collisionStart", (pairs) => {});//usd for friction
    };
    getGlobalForces(){
        return this.globalForces;
    };
    addGlobalForce(force){
        for(let o in this.objects){
            o.attachForce(force);
        };
        this.globalForces.push(force);
    };
    removeGlobalForce(force){
        let index = this.objects.indexOf(force);
        if (index != -1){
            this.globalForces.splice(index, 1);
        };
    };
}