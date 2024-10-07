import csv
import json

def csv_to_json(csv_filepath, json_filepath):
    result = {}
    block_base = {}

    with open(csv_filepath, newline='', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        rows = list(reader)

        for i, row in enumerate(rows):
            # Извлекаем нужные данные из CSV строки
            index_raw = row['Вопрос индекс']
            question = row['Вопрос']
            
            answer_type = index_raw.split(" ")[1]
            index = index_raw.split(" ")[0]

            options = {}
            if answer_type in ["test", "test-rec"]:
                for j in range(1, 4):  # Предполагаем, что есть 3 варианта ответа
                    options[str(j)] = {}
                    options[str(j)]["title"] = " ".join(row['Варианты ответов'].splitlines()[j-1].split(' ')[1:])
                
                for j in range(1, 4):  # Предполагаем, что есть 3 варианта ответа
                    cell_text = row[f'если выбран {j}'].strip()
                    if cell_text != "":
                        if cell_text.startswith("question-redirect"):
                            options[str(j)]["redirect_question"] = cell_text.split(" ")[1]
                        if cell_text.startswith("blocks-redirect"):
                            options[str(j)]["redirect-blocks"] = []
                            for block in cell_text.splitlines()[1:]:
                                block_json = {}
                                block_json["title"] = block.split('"')[1]
                                block_json["block-num"] = block.split('"')[2].strip().split(" ")[0]
                                if ' с ' in block:
                                    block_json["start-question"] = block.split(" с ")[1].split(" ")[0]
                                if ' до ' in block:
                                    block_json["finish-question"] = block.split(" до ")[1].split(" ")[0]
                                options[str(j)]["redirect-blocks"].append(block_json)
                    if cell_text.startswith("finish-block"):
                        options[str(j)]["finish-block"] = True
                

            block_base[index] = {
                "question": question,
                "answer_type": answer_type,
            }

            if options:
                block_base[index]["options"] = options

            # Добавляем параметр "next-question"
            if i < len(rows) - 1:  # Если не последний вопрос
                next_index_raw = rows[i + 1]['Вопрос индекс']
                next_index = next_index_raw.split(" ")[0]
                block_base[index]["next-question"] = next_index
            else:
                block_base[index]["next-question"] = None  # У последнего вопроса нет следующего

    result['block_base'] = block_base

    with open(json_filepath, 'w', encoding='utf-8') as jsonfile:
        json.dump(result, jsonfile, ensure_ascii=False, indent=4)

# Использование функции
csv_filepath = 'test.csv'  # Укажите путь к вашему CSV-файлу
json_filepath = 'output.json'  # Укажите путь для сохранения JSON

csv_to_json(csv_filepath, json_filepath)
