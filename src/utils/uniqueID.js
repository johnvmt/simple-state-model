// uniqueID v0.0.1
const s4 = () => {
    return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
}

const COMPLEXITIES = {
    LOW: "LOW",
    MEDIUM: "MEDIUM",
    HIGH: "HIGH"
}

const uniqueID = (complexity = COMPLEXITIES.HIGH) => {
    if(complexity === COMPLEXITIES.LOW)
        return s4();
    else if(complexity === COMPLEXITIES.MEDIUM)
        return `${s4()}${s4()}-${s4()}`;
    else if(complexity === COMPLEXITIES.HIGH)
        return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
}

export default uniqueID;
export {
    uniqueID,
    COMPLEXITIES
};