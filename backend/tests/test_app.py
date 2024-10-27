import pytest

from backend.app import (llama_request_async, get_all_questions, llama_request, llama_create_schedule_async,
                         llama_create_isikava, llama_create_schedule, get_questions)
import pytest_aio


@pytest.mark.parametrize("filename", ["C:\\Users\dnsuser\PycharmProjects\kоsarev\\backend\questions.json"])
def test_get_all_questions(filename): # Замените на ожидаемый результат
    result = get_all_questions(filename)

    assert isinstance(result, dict)


@pytest.mark.asyncio
async def test_llama_request_async():
    prompt = "Hi. Return '0' only answer"
    max_token = 50
    expected_result = "0"  # Замените на ожидаемый результат
    result = await llama_request_async(prompt, max_token)

    assert isinstance(result, str)
    assert result == expected_result


def test_llama_request():
    prompt = "Hi. Return '0' only answer"
    max_token = 50
    expected_result = "0"  # Замените на ожидаемый результат
    result = llama_request(prompt, max_token)

    assert isinstance(result, str)
    assert result == expected_result


@pytest.mark.asyncio
async def test_llama_create_schedule_async():
    formatted_text = "Hello, world!"
    expected_result = " "  # Замените на ожидаемый результат

    result = await llama_create_schedule_async(formatted_text)
    assert isinstance(result, str)
    #assert result == expected_result


def test_llama_create_schedule():
    formatted_text = "Hello, world!"
    expected_result = "" # Замените на ожидаемый результат

    result = llama_create_schedule(formatted_text)

    assert isinstance(result, str)
    #assert result == expected_result


def test_llama_create_isikava():
    formatted_text = "Hello, world!"
    expected_result = "" # Замените на ожидаемый результат

    result = llama_create_isikava(formatted_text)

    assert isinstance(result, str)
    #assert result == expected_result


@pytest.mark.parametrize("question_id, expected_result", [
    ("Отсутствие других барьеров-Пострадавший-base_block-1", {'answer_type': 'text', 'next_question': '2', 'question': 'Назовите, пожалуйста, Ваше фамилию, имя и отчество'}),
    ("Отсутствие других барьеров-Очевидец-base_block-1", {'answer_type': 'text', 'next_question': '2', 'question': 'Назовите, пожалуйста, Ваше фамилию, имя и отчество'}),])
def test_get_questions(question_id, expected_result):
    result = get_questions(question_id)

    assert result == expected_result


if __name__ == '__main__':
    pytest.main()


