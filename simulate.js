// 后端，实现各种单元模块以及其随时钟周期的状态更新

/*
 * 指令类，存储能被模拟器执行的指令
 */
function Instruction(Op, dest, source_1, source_2) {
    this.Op = Op;
    this.dest = dest;
    this.source_1 = source_1;
    this.source_2 = source_2;
    this.state = 0; // 0: 未运行, 1: 正在运行, 2: 完成
    this.stage = ["", "", "", ""];
    this.ready = false;
}

// 为指令类重载比较函数
Instruction.compare = function (instruction_1, instruction_2) {
    if (!instruction_1 && !instruction_2) return true;
    if (!instruction_1 || !instruction_2) return false;
    if (instruction_1.Op !== instruction_2.Op) return false;
    if (instruction_1.dest !== instruction_2.dest) return false;
    if (instruction_1.source_1 !== instruction_2.source_1) return false;
    return instruction_1.source_2 === instruction_2.source_2;
}

// 获取指令的发射时间
Instruction.prototype.issueTime = function () {
    return Number(this.stage[0]);
}

// 格式化原始指令样式 OP DST SRC1 SRC2
Instruction.prototype.getSource = function () {
    return this.Op + " " + this.dest + " " + this.source_1 + " " + this.source_2;
}

// 获取指令的目的寄存器
Instruction.prototype.getDest = function () {
    return this.dest;
}

// 将指令设置为 Issue 阶段
Instruction.prototype.setIssue = function (clock) {
    // this.state = 1;
    this.stage[0] = clock;
}

// 将指令设置为 Operand 阶段
Instruction.prototype.setOperand = function (clock) {
    this.stage[1] = clock + "";
}

// 将指令设置为 Exec 阶段
Instruction.prototype.setExec = function (clock) {
    this.stage[2] = clock + "";
}

// 将指令设置为 Write 阶段
Instruction.prototype.setWrite = function (clock) {
    this.state = 2;
    this.stage[3] = clock + "";
}

// 判断指令是否正在运行
Instruction.prototype.isRunning = function () {
    return this.state >= 1;
}

// 判断指令是否已经完成
Instruction.prototype.isFinished = function () {
    return this.state === 2;
}


/*
 * ReorderBuffer 类，提供 ReorderBuffer 信息和操作
 */
function ReorderBuffer(name, execTime) {
    this.name = name;
    this.Pointer = "";
    this.Entry = "";
    this.Busy = "No";
    this.Instruction = "";
    this.State = "";
    this.Destination = "";
    this.Value = "";
    this.exec = 0;
    this.execTime = execTime;   // 执行用时
    this.execStart = 0; // 当前指令的开始时间
    this.currentInstruction = null; // 当前正在执行的指令
    this.Op = "";
    this.flag = 0;

}

// 当指令完成, 清除信息
ReorderBuffer.prototype.clear = function () {
    this.Pointer = "";
    this.Entry = "";
    this.Busy = "No";
    this.Instruction = "";
    this.State = "";
    this.Destination = "";
    this.Value = "";
    this.exec = 0;
    this.execStart = 0;
    this.currentInstruction = null;
    this.Op = "";
    this.flag = 0;
}

// 将指令加载进 ReorderBuffer
ReorderBuffer.prototype.loadInstruction = function (entry, instruction, registers, clock) {
    // 如果 ReorderBuffer 正在执行指令, 不能加载新的指令
    if (this.exec !== 0) {
        return false;
    }

    instruction.setIssue(clock);

    this.Op = instruction.Op;

    // 设置各操作数的执行时间
    switch (this.Op) {
        case "LD":
            this.execTime = 1;
            break;
        case "SD":
            this.execTime = 1;
            break;
        case "ADDD":
            this.execTime = 2;
            break;
        case "SUBD":
            this.execTime = 2;
            break;
        case "MULTD":
            this.execTime = 10;
            break;
        case "DIVD":
            this.execTime = 20;
            break;
    }

    this.Entry = entry.toString();

    // 指针转换
    if (this.Entry === "1") {
        this.Pointer = "Head->";
    } else {
        this.Pointer = "Tail->"
    }

    this.currentInstruction = instruction;
    this.exec = 1;

    this.Busy = "Yes";
    this.Instruction = instruction.getSource();
    this.State = "Issue"
    this.Destination = instruction.getDest();
    // if(this.State === "Write")
    this.Value = ""

    // console.log(instruction)

    return true;
}


// 更新 ReorderBuffer
ReorderBuffer.prototype.forwardPipeline = function (p, sum, registers, fetched, clock) {

    this.flag = 0;

    if (Number(this.Entry) < sum && this.Pointer !== "Head->") {
        this.Pointer = "";
    }

    if (p !== 0) {
        this.Pointer = "Head->";
    }

    if (this.currentInstruction && this.currentInstruction.ready === true) {
        switch (this.exec) {
            case 1:  // 执行阶段

                if (this.execStart === 0) {
                    this.execStart = clock;
                }

                if (this.Op === "LD" || this.Op === "SD") {
                    this.State = "Exec";
                } else {
                    this.State = "Exec" + (clock - this.execStart + 1).toString();
                }

                if (clock - this.execStart + 1 >= this.execTime) {
                    this.exec++;  // 进入下一阶段
                }


                break;
            case 2:  // 写回阶段
                // this.currentInstruction.setExec(clock);
                // // The operand stage must last the number of clock which is given.

                this.State = "Write";

                let a="", b="";
                for (let i in registers) {
                    // console.log(registers[i].name)
                    // console.log(this.currentInstruction.source_1)
                    if (isNaN(this.currentInstruction.source_1) && registers[i].name === this.currentInstruction.source_1) {
                        a = registers[i].history;
                        // console.log(a);
                    }
                    if (isNaN(this.currentInstruction.source_2) && registers[i].name === this.currentInstruction.source_2) {
                        b = registers[i].history;
                        // console.log(b);
                    }
                }

                if (a === "") {
                    a = `Regs[${this.currentInstruction.source_1}]`;
                }
                if (b === "") {
                    b = `Regs[${this.currentInstruction.source_2}]`;
                }

                if (this.Op === "LD") {
                    this.Value = `Mem[${this.currentInstruction.source_1}+Regs[${this.currentInstruction.source_2}]]`;
                } else if (this.Op === "ADDD") {

                    this.Value = a + "+" + b;
                } else if (this.Op === "SUBD") {

                    this.Value = a + "-" + b;
                } else if (this.Op === "MULTD") {

                    this.Value = a + "×" + b;
                } else if (this.Op === "DIVD") {

                    this.Value = a + "/" + b;
                }

                registers[this.Destination].read = 1;
                registers[this.Destination].Value = this.Value;

                if (this.Pointer === "Head->") {
                    this.exec++;
                }

                break;
            case 3:  // 提交阶段

                this.exec++;  // EX --> WB
                this.State = "Commit";
                this.Busy = "No";
                this.Pointer = "";
                this.flag = Number(this.Entry);

                // console.log(fetched);
                this.currentInstruction.setWrite();

                registers[this.Destination].clear();

                break;
            case 4:
                // this.clear();
                break;
        }
    }


    return this.flag;

}

// Exec过渡, 避免bug
ReorderBuffer.prototype.updateInfo = function (registers, clock) {

    if (this.currentInstruction && this.currentInstruction.ready === true && this.execStart === 0) {
        // console.log("sssssssssssssssssssssssss");
        this.execStart = clock;

        if (this.Op === "LD" || this.Op === "SD") {
            this.State = "Exec";
        } else {
            this.State = "Exec" + (clock - this.execStart + 1).toString();
        }

        if (clock - this.execStart + 1 >= this.execTime) {
            this.exec++;
        }

    }
}



/*
 * ReservationStations 类，提供 ReservationStations 信息和操作
 */
function ReservationStations(name, execTime) {
    this.name = name;
    this.Busy = "No";
    this.Op = "";
    this.Vj = "";
    this.Vk = "";
    this.Qj = "";
    this.Qk = "";
    this.A = "";
    this.Dest = "";
    this.exec = 0;
    this.execTime = execTime;   // 指令的执行时间
    this.execStart = 0; // 当前指令开始时间
    this.currentInstruction = null; // 当前正在执行的指令
}

// 当指令完成时清除信息
ReservationStations.prototype.clear = function () {
    this.Busy = "No";
    this.Op = "";
    this.Vj = "";
    this.Vk = "";
    this.Qj = "";
    this.Qk = "";
    this.A = "";
    this.Dest = "";
    this.exec = 0;
    this.execStart = 0;
    this.currentInstruction = null;
}

// 加载指令
ReservationStations.prototype.loadInstruction = function (e, instruction, registers, clock) {
    // 若没空位则不加载
    if (this.exec !== 0) {
        return false;
    }

    this.currentInstruction = instruction;
    this.Busy = "Yes";
    this.exec = 1;
    this.Op = instruction.Op;
    this.Dest = "#" + e.toString();

    // 设置各操作数的执行时间
    switch (this.Op) {
        case "LD":
            this.execTime = 1;
            break;
        case "SD":
            this.execTime = 1;
            break;
        case "ADDD":
            this.execTime = 2;
            break;
        case "SUBD":
            this.execTime = 2;
            break;
        case "MULTD":
            this.execTime = 10;
            break;
        case "DIVD":
            this.execTime = 20;
            break;
    }

    // 更新Vj/Qj
    if (isNaN(instruction.source_1)) {

        if (registers[instruction.source_1].Busy === "Yes") {
            if (registers[instruction.source_1].read === 1) {
                this.Vj = registers[instruction.source_1].Value;
            } else {
                this.Qj = registers[instruction.source_1].Reorder;
            }
        } else {
            if (registers[instruction.source_1].read === 1) {
                this.Vj = registers[instruction.source_1].Value;
            } else {
                this.Vj = "Regs[" + instruction.source_1 + "]";
            }
        }

    }
    // 更新Vk/Qk
    if (isNaN(instruction.source_2)) {

        if (registers[instruction.source_2].Busy === "Yes") {
            if (registers[instruction.source_2].read === 1) {
                this.Vk = registers[instruction.source_2].Value;
            } else {
                this.Qk = registers[instruction.source_2].Reorder;
            }
        } else {
            if (registers[instruction.source_2].read === 1) {
                this.Vk = registers[instruction.source_2].Value;
            } else {
                this.Vk = "Regs[" + instruction.source_2 + "]";
            }
        }

    }
    // 更新A
    if (!isNaN(instruction.source_1)) {
        this.A = instruction.source_1;
    }
    if (!isNaN(instruction.source_2)) {
        this.A = instruction.source_2;
    }


    registers[instruction.dest].Reorder = this.Dest;
    registers[instruction.dest].history = registers[instruction.dest].Reorder;
    registers[instruction.dest].Busy = "Yes";


    if (this.Qj.length === 0 && this.Qk.length === 0) {
        if(this.currentInstruction){
            this.currentInstruction.ready = true;
        }
    }

    return true;
}


// 推进保留站状态
ReservationStations.prototype.forwardPipeline = function (registers, clock) {

    if (this.Qj.length !== 0 && registers[this.currentInstruction.source_1].read === 1) {
        this.Vj = registers[this.currentInstruction.source_1].Value;
        this.Qj = "";
    }

    if (this.Qk.length !== 0 && registers[this.currentInstruction.source_2].read === 1) {
        this.Vk = registers[this.currentInstruction.source_2].Value;
        this.Qk = "";
    }


    if (this.Qj.length === 0 && this.Qk.length === 0) {
        if(this.currentInstruction){
            this.currentInstruction.ready = true;
        }
    }

    if (this.currentInstruction && this.currentInstruction.ready === true) {
        switch (this.exec) {
            case 1:

                if (this.execStart === 0) {
                    this.execStart = clock;
                }

                if (this.Op === "LD") {
                    this.A = `${this.A}+${this.Vk}`;
                    this.Vk = "";
                }
                // this.currentInstruction.setOperand(clock);

                if (clock - this.execStart + 1 >= this.execTime) {
                    this.exec++;
                }

                break;
            case 2:  // 结束
                this.clear();
        }
    }


    if (this.Qj.length === 0 && this.Qk.length === 0) {
        if(this.currentInstruction){
            this.currentInstruction.ready = true;
        }
    }

}

// 暂未使用
ReservationStations.prototype.updateInfo = function (registers) {

}


/*
 * 寄存器类存储关于寄存器的信息
 */
function Register(name) {
    this.name = name;
    this.Busy = "No"; // false: not busy, true: busy
    this.Reorder = "";
    this.read = 0;
    this.Value = "";
    this.history = "";
}

// 清除信息
Register.prototype.clear = function () {
    this.Busy = "No";
    this.Reorder = "";
    // this.read = 0;
    // this.Value = "";
}


/*
 * 控制器类，控制模拟器，管理上面的ROB、保留站、寄存器、指令和时钟
 */
function Controller(instructions) {
    this.clock = 0;     // 系统时钟
    this.maxFetchSize = 10;     //一次最大运行的指令数
    this.instructions = instructions;   // 需要被执行的指令
    this.fetched = [];  // 就绪和运行的指令

    this.phead = 0;

    // 实例化保留站
    this.ReservationStationsSet = {
        "Load1": new ReservationStations("Load1", 1),
        "Load2": new ReservationStations("Load2", 1),
        "Add1": new ReservationStations("Add1", 2),
        "Add2": new ReservationStations("Add2", 2),
        "Add3": new ReservationStations("Add3", 2),
        "Mult1": new ReservationStations("Mult1", 10),
        "Mult2": new ReservationStations("Mult2", 10)
    };

    // 指令对应的单元
    this.opToReservationStations = {
        "LD": ["Load1", "Load2"],
        "SD": ["Load1", "Load2"],
        "ADDD": ["Add1","Add2","Add3"],
        "SUBD": ["Add1", "Add2", "Add3"],
        "MULTD": ["Mult1", "Mult2"],
        "DIVD": ["Mult1", "Mult2"]
    }

    // 实例化ROB
    this.ReorderBufferSet = {
        "E1": new ReorderBuffer("E1", 1),
        "E2": new ReorderBuffer("E2", 1),
        "E3": new ReorderBuffer("E3", 1),
        "E4": new ReorderBuffer("E4", 1),
        "E5": new ReorderBuffer("E5", 1),
        "E6": new ReorderBuffer("E6", 1)
    };


    // 实例化寄存器
    this.registers = {

        "F0" : new Register("F0"), "F1" : new Register("F1"), "F2" : new Register("F2"),
        "F3" : new Register("F3"), "F4" : new Register("F4"), "F5" : new Register("F5"),
        "F6" : new Register("F6"), "F7" : new Register("F7"), "F8" : new Register("F8"),
        "F9" : new Register("F9"), "F10": new Register("F10"), "F11": new Register("F11"),
        "F12": new Register("F12"), "F13": new Register("F13"), "F14": new Register("F14"),
        "F15": new Register("F15"), "F16": new Register("F16"), "F17": new Register("F17"),
        "F18": new Register("F18"), "F19": new Register("F19"), "F20": new Register("F20"),
        "F21": new Register("F21"), "F22": new Register("F22"), "F23": new Register("F23"),
        "F24": new Register("F24"), "F25": new Register("F25"), "F26": new Register("F26"),
        "F27": new Register("F27"), "F28": new Register("F28"), "F29": new Register("F29"),
        "F30": new Register("F30"), "F31": new Register("F31"),

        "R0" : new Register("R0"), "R1" : new Register("R1"), "R2" : new Register("R2"),
        "R3" : new Register("R3"), "R4" : new Register("R4"), "R5" : new Register("R5"),
        "R6" : new Register("R6"), "R7" : new Register("R7"), "R8" : new Register("R8"),
        "R9" : new Register("R9"), "R10": new Register("R10"), "R11": new Register("R11"),
        "R12": new Register("R12"), "R13": new Register("R13"), "R14": new Register("R14"),
        "R15": new Register("R15"), "R16": new Register("R16"), "R17": new Register("R17"),
        "R18": new Register("R18"), "R19": new Register("R19"), "R20": new Register("R20"),
        "R21": new Register("R21"), "R22": new Register("R22"), "R23": new Register("R23"),
        "R24": new Register("R24"), "R25": new Register("R25"), "R26": new Register("R26"),
        "R27": new Register("R27"), "R28": new Register("R28"), "R29": new Register("R29"),
        "R30": new Register("R30"), "R31": new Register("R31")

    }
}

// 判断指令是否处于模拟器中
Controller.prototype.isInInstructionSet = function (op) {
    return !!this.opToReservationStations[op];
}

// 取值进就绪和运行队列
Controller.prototype.fetchInstruction = function () {
    const temp = this.instructions.shift();
    const count = this.fetched.filter(function (element) {
        return !element.isFinished();
    }).length;
    if (temp && count < this.maxFetchSize) {
        this.fetched.push(temp);
    }
}

// 添加指令进指令队列
Controller.prototype.addInstruction = function (instruction) {
    this.instructions.push(instruction);
}

// 获取不在队列中的指令
Controller.prototype.getNotExecInstruction = function () {
    return this.instructions;
}

// 打印信息，debug
Controller.prototype.toString = function () {
    let key;
    let temp = "Instructions: \n";
    this.instructions.forEach(function (element) {
        temp += element.toString() + "\n";
    });
    temp += "\nfetched_instructions: \n";
    this.fetched.forEach(function (element) {
        temp += element.toString() + "\n";
    });
    temp += "\nFunction unit: \n";
    for (key in this.functionUnitSet) {
        temp += this.functionUnitSet[key].toString() + "\n";
    }
    // temp += "\nRegisters: \n";
    // for (key in this.registers) {
    //     temp += key + ": " + this.registers[key].toString() + "\n";
    // }
    return temp;
}

// 推进模拟器至下一时钟周期
Controller.prototype.forward = function () {
    let key;
    // console.log(this.toString());  // debug info is here
    this.clock++;
    this.fetchInstruction();
    const issue = [];
    // this.fetched = this.instructions;


    for (key in this.ReorderBufferSet) {
        this.phead = this.ReorderBufferSet[key].forwardPipeline(this.phead, this.fetched.length, this.registers, this.fetched, this.clock);
    }

    if (this.clock <= this.fetched.length + this.instructions.length) {
        // console.log(this.fetched.length);
        // console.log(this.instructions.length);

        // 尝试发射一条指令
        for (let i = 0; i < this.fetched.length; i++) {
            const element = this.fetched[this.fetched.length - 1];
            // 尝试发射未运行的指令
            if (!element.isRunning()) {

                const unit = this.ReorderBufferSet[`E${this.fetched.length}`];
                // console.log(unit);
                if (unit.loadInstruction(this.fetched.length, element, this.registers, this.clock)) {
                    // issue.push(unit);
                    // break;
                }

            }
        }
    }


    for (key in this.ReservationStationsSet) {
        this.ReservationStationsSet[key].forwardPipeline(this.registers, this.clock);
    }

    for (key in this.ReservationStationsSet) {
        this.ReservationStationsSet[key].updateInfo(this.registers);
    }

    if (this.clock <= this.fetched.length + this.instructions.length) {
        // 尝试发射一条指令
        for (let i = 0; i < this.fetched.length; i++) {
            const element = this.fetched[this.fetched.length - 1];
            // console.log(i)
            // console.log(this.fetched.length)

            // 尝试发射未运行的指令
            if (!element.isRunning()) {

                const unitnames = this.opToReservationStations[element.Op];
                // console.log(unitnames.length)

                for (i = 0; i < unitnames.length; i++) {
                    const unit = this.ReservationStationsSet[unitnames[i]];
                    // console.log(unit);
                    if (unit.loadInstruction(this.fetched.length, element, this.registers, this.clock)) {
                        issue.push(unit);
                        break;
                    }
                }

                break;
            }
        }
    }



    for (let i = 0; i < this.fetched.length; i++) {
        // console.log(this.fetched[i].stage[0]);
        // console.log(this.clock);
        for (key in this.ReorderBufferSet) {
            // if (key.currentInstruction) console.log(key.currentInstruction.stage[0]);
            // console.log(key);
            if (this.ReorderBufferSet[key].currentInstruction && this.ReorderBufferSet[key].currentInstruction.stage[0] !== this.clock) {
                this.ReorderBufferSet[key].updateInfo(this.registers, this.clock);
            }
        }
    }


    if (this.clock === 0) {
        return true;
    }
    // console.log(`clock: ${this.clock}, fetched: ${this.fetched}`)

    // 判断所有指令是否都完成
    const count = this.fetched.filter(function (element) {
        return !element.isFinished();
    }).length;
    return count !== 0;
}
