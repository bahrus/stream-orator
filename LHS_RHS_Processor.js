export class LHS_RHS_Processor {
    constructor(lhs, rhs) {
        this.lhs = lhs;
        this.rhs = rhs;
        this._foundStart = false;
        this._foundEnd = false;
    }
    filter(s) {
        if (!this._foundStart) {
            const iPos = s.indexOf(this.lhs);
            if (iPos === -1)
                return '';
            this._foundStart = true;
            return s.substr(iPos);
        }
        else if (!this._foundEnd) {
            const iPos = s.indexOf(this.rhs);
            if (iPos === -1)
                return s;
            this._foundEnd = true;
            return s.substr(0, iPos + this.rhs.length);
        }
    }
}
