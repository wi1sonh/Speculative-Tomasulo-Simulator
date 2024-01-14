// 关联前端界面，定义各种功能，连接前端和后端

let callback = function () {
    // 初始化 bootstrap tooltip
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl))
    const toastElList = document.querySelectorAll('.toast')
    const toastList = [...toastElList].map(toastEl => new bootstrap.Toast(toastEl, {
        delay: 6000
    }))
    let has_finished = false

    // 跳过空指令的标志
    var f = 0;

    // 设置两个指令之间的时间间隔
    const TimeoutVal = 1000;

    // 预加载的指令

    // let source = [
    //     "LD F6 34 R2",
    //     "LD F2 45 R3",
    //     "MULT F0 F5 F2",
    //     "MULT F7 F2 F6",
    //     "ADDD F6 F8 F7"
    // ]

    let source = [
        "LD F6 34 R2",
        "LD F2 45 R3",
        "MULTD F0 F2 F4",
        "SUBD F8 F6 F2",
        "DIVD F10 F0 F6",
        "ADDD F6 F8 F2"
    ]

    document.getElementById("new_instructions")
        .setAttribute("placeholder", source.join("\n"))

    // 实例化控制器
    let controller = new Controller([]);
    let timeID = 0;

    // continue 按钮功能实现
    document.getElementById("continue").onclick = function () {
        console.debug("clicked continue button")
        setUIandButtonState("pause", true)
        setUIandButtonState("continue", false)
        window.clearTimeout(timeID)
        timeID = window.setTimeout(uiRunSimulate, TimeoutVal)
    }

    // pause 按钮功能实现
    document.getElementById("pause").onclick = function () {
        console.debug("clicked pause button")
        setUIandButtonState("pause", false)
        setUIandButtonState("continue", true)
        window.clearTimeout(timeID)
    };

    // reset 按钮功能实现
    document.getElementById("reset").onclick = function () {
        console.debug("clicked reset button")
        document.getElementById("clockNum").innerText = "--"

        setUIandButtonState("continue", false)
        setUIandButtonState("pause", false)
        setUIandButtonState("reset", false)
        setUIandButtonState("load", true)
        document.getElementById("new_instructions").removeAttribute("readonly")
        const ul_elem = document.getElementById("unloaded_instruction_placeholder")
        if (ul_elem) ul_elem.classList.remove("invisible")

        // clear instruction status(UI)
        const unloaded_instruction_div = document.createElement("div")

        unloaded_instruction_div.setAttribute("id", "unloaded_instruction_placeholder")

        const p = document.createElement("p")
        p.textContent = "请点击Load按钮加载指令，这里才会显示内容"
        p.setAttribute("class", "text-center align-middle text-secondary")
        unloaded_instruction_div.appendChild(p)

        const ul = document.querySelectorAll("#all_instructions > ul")[0]
        if (ul){
            document.getElementById("all_instructions").removeChild(ul)
        }
        document.getElementById("all_instructions").appendChild(unloaded_instruction_div)
        document.getElementById("new_instructions").setAttribute("placeholder", source.join("\n"))

        clearController()

        uiUpdateReorderBuffer(controller);
        uiUpdateReservationStations(controller);
        uiUpdateRegister(controller);

        window.clearTimeout(timeID)
        document.getElementById('output').value = ""
    }

    // 获取文件输入框和文本框
    var fileInput = document.getElementById('fileInput');
    var textArea = document.getElementById('new_instructions');
    var saveButton = document.getElementById('save');
    var outputArea = document.getElementById('output');
    // 隐藏 output 文本框
    outputArea.style.display = 'none';

    // 添加change事件监听器
    fileInput.addEventListener('change', function (event) {
    // 获取选中的文件列表
    var fileList = event.target.files;

    // 确保存在文件
    if (fileList.length > 0) {
        // 获取第一个文件
        var file = fileList[0];

        // 创建FileReader对象
        var reader = new FileReader();

        // 定义读取完成时的回调函数
        reader.onload = function (e) {
        // 读取的文件内容在e.target.result中
        var fileContent = e.target.result;

        // 将文件内容设置为文本框的值
        textArea.value = fileContent;
        };

        // 开始读取文件
        reader.readAsText(file);
    }
    });

    // 添加保存按钮的点击事件监听器
    saveButton.addEventListener('click', function () {
        // 获取文本框的值
        var content = outputArea.value;

        // 创建Blob对象
        var blob = new Blob([content], { type: 'text/plain' });

        // 创建下载链接
        var downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.download = 'output.txt';

        // 将下载链接添加到文档中
        document.body.appendChild(downloadLink);

        // 模拟点击下载链接
        downloadLink.click();

        // 移除下载链接
        document.body.removeChild(downloadLink);
    });



    // load 按钮功能实现
    document.getElementById("load").onclick = function () {

        uiRunSimulate()

        setUIandButtonState("load", false)
        document.getElementById("new_instructions").setAttribute("readonly", 'true')
        setUIandButtonState("continue", false)
        setUIandButtonState("pause", true)
        setUIandButtonState("reset", true)

        const ul_elem = document.getElementById("unloaded_instruction_placeholder")
        if (ul_elem) ul_elem.classList.add("invisible")

        // 加载文本框中的新指令
        const ins_input = document.getElementById("new_instructions").value
        document.getElementById("new_instructions").setAttribute("placeholder", "")
        let new_instructions
        if (ins_input.trim().length === 0) {
            new_instructions = source
        } else {
            new_instructions = ins_input.trim().split("\n")
        }
        // 清除之前的控制器
        clearController()

        try {
            new_instructions.forEach(function (instruction) {
                if (instruction === "") {
                    return;
                }
                const elements = instruction.split(" ");
                if (elements.length !== 4) {
                    throw new Error(`Bad instruction ${instruction}, length should be 4`);
                }
                if (controller.isInInstructionSet(elements[0])) {
                    controller.addInstruction(new Instruction(elements[0],
                        elements[1], elements[2], elements[3]));
                } else {
                    throw new Error(`element ${instruction} not in instruction set`);
                }
            });
            // document.querySelectorAll("#instruction_table>tr").forEach((ele) => {
            //     ele.remove()
            // })
            const all_instructions = controller.getNotExecInstruction().map(
                function (obj) {
                    return '<li class="list-group-item list-group-item-action instruction-item">' + obj.getSource() + "</li>";
                }
            );
            const str = all_instructions.join("");
            document.getElementById("all_instructions").innerHTML = `<ul class="list-group list-group-flush w-100">${str}</ul>`
            window.clearTimeout(timeID);
            timeID = window.setTimeout(uiRunSimulate, TimeoutVal);
        } catch (e) {
            console.error(`error instruction: ${e}`);
        }
    }


    // 推进模拟器并更新 UI
    function uiRunSimulate() {
        const res = controller.forward()
        if (res) {
            timeID = window.setTimeout(uiRunSimulate, TimeoutVal);
        } else {
            // console.log("last run of uiRunSimulate()")
            if(has_finished){
                toastList.forEach(toast => toast.show())
                console.debug("本轮演示完毕！")
            }
            has_finished = true
            setUIandButtonState("load", true)
            setUIandButtonState("continue", false)
            setUIandButtonState("pause", false)
            setUIandButtonState("reset", false)
            const ul_elem = document.getElementById("unloaded_instruction_placeholder")
            if (ul_elem) ul_elem.classList.remove("invisible")
            document.getElementById("new_instructions").removeAttribute("readonly")
            document.getElementById("new_instructions").setAttribute("placeholder", source.join("\n"))
        }
        document.getElementById("clockNum").innerText = controller.clock

        if (f === 1) outputArea.value = outputArea.value + "cycle " + controller.clock + ":\n";

        //更新三个表
        uiUpdateReorderBuffer(controller);
        uiUpdateReservationStations(controller);
        uiUpdateRegister(controller);

        if (f === 1) outputArea.value = outputArea.value + "\n";

        f = 1;

        const all_instructions = controller.getNotExecInstruction().map(
            function (obj) {
                return '<li class="list-group-item list-group-item-action instruction-item">' + obj.getSource() + "</li>";
            }
        );
        const str = all_instructions.join("");
        document.getElementById("all_instructions").innerHTML = `<ul class="list-group list-group-flush w-100">${str}</ul>`
    }


    // 更新 ROB 表
    function uiUpdateReorderBuffer(simulator) {
        var i = 1;
        for (const key in simulator.ReorderBufferSet) {
            if (f === 1) outputArea.value = outputArea.value + "entry" + i + " : ";
            i++;
            const unit = simulator.ReorderBufferSet[key];
            const row = document.getElementById(key);
            for (const element in unit) {
                e = key + "_" + element;
                const temp = row.getElementsByClassName(e);
                if (temp.length !== 0) {
                    temp[0].textContent = unit[element];
                    if(element==="Busy" || element==="Instruction" || element==="State" || element==="Destination" || element==="Value"){
                        if (f === 1) outputArea.value = outputArea.value + unit[element];
                    }
                }
                if (element === "Busy" || element === "Instruction" || element === "State" || element === "Destination") {
                    if (f === 1) outputArea.value = outputArea.value + ",";
                }
                else if (element === "Value") {
                    if (f === 1) outputArea.value = outputArea.value + ";";
                }
            }
            if (f === 1) outputArea.value = outputArea.value + "\n";
        }
    }


    // 更新 Reservation Stations
    function uiUpdateReservationStations(simulator) {

        for (const key in simulator.ReservationStationsSet) {

            const unit = simulator.ReservationStationsSet[key];
            const row = document.getElementById(key);
            if (f === 1) outputArea.value = outputArea.value + unit.name + " : ";
                // uiSetUnitStage(row, unit.exec);
            for (const element in unit) {
                const temp = row.getElementsByClassName(key + "_" + element);
                // console.log(temp)
                if (temp.length !== 0) {

                    temp[0].textContent = unit[element];
                    if (element === "Busy" || element === "Op" || element === "Vj" || element === "Vk" || element === "Qj" || element === "Qk" || element === "Dest") {
                        if (f === 1) outputArea.value = outputArea.value + unit[element];
                    }
                }
                if (element === "Busy" || element === "Op" || element === "Vj" || element === "Vk" || element === "Qj" || element === "Qk") {
                    if (f === 1) outputArea.value = outputArea.value + ",";
                }
                else if (element === "Dest") {
                    if (f === 1) outputArea.value = outputArea.value + ";";
                }
            }
            if (f === 1) outputArea.value = outputArea.value + "\n";

        }
    }

    // 更新寄存器表
    function uiUpdateRegister(simulator) {
        if (f === 1) outputArea.value = outputArea.value + "Reorder: ";
        for (const key in simulator.registers) {
            const row1 = document.getElementById(`${key}_Reorder`);
            if (row1.innerText !== simulator.registers[key].Reorder) {
                row1.innerText = simulator.registers[key].Reorder;
            }
            if (key === "F0" || key === "F1" || key === "F2" || key === "F3" || key === "F4" || key === "F5" || key === "F6" || key === "F7" || key === "F8" || key === "F9" || key === "F10") {
                if (f === 1) outputArea.value = outputArea.value + key +": " +simulator.registers[key].Reorder+";";
            }
        }
        if (f === 1) outputArea.value = outputArea.value + "\n";

        if (f === 1) outputArea.value = outputArea.value + "Busy: ";
        for (const key in simulator.registers) {

            const row2 = document.getElementById(`${key}_Busy`);
            if (row2.innerText !== simulator.registers[key].Busy) {
                row2.innerText = simulator.registers[key].Busy;
            }
            if (key === "F0" || key === "F1" || key === "F2" || key === "F3" || key === "F4" || key === "F5" || key === "F6" || key === "F7" || key === "F8" || key === "F9" || key === "F10") {
                if (f === 1) outputArea.value = outputArea.value + key +": " +simulator.registers[key].Busy+";";
            }
        }
        if (f === 1) outputArea.value = outputArea.value + "\n";
    }


    // 启动/禁用按钮
    function setUIandButtonState(buttonID, isEnabled) {
        if (document.getElementById(buttonID) === null) {
            return
        }
        if (isEnabled) {
            document.getElementById(buttonID).classList.remove("disabled")
            document.getElementById(buttonID).removeAttribute("disabled")
        } else {
            document.getElementById(buttonID).classList.add("disabled")
            document.getElementById(buttonID).setAttribute("disabled", "disabled")
        }
    }

    // 清除
    function clearController() {
        controller = new Controller([])
        has_finished = false
    }
};

// 启动
if (
    document.readyState === "complete" ||
    (document.readyState !== "loading" && !document.documentElement.doScroll)
) {
    callback();
} else {
    document.addEventListener("DOMContentLoaded", callback);
}