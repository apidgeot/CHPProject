import React, { useState, useEffect, useRef} from 'react';
import axios from 'axios';
//import { ChevronsRightLeft } from 'lucide-react';
//import { TypeAnimation } from 'react-type-animation';
//import { Mic, MicOff } from 'lucide-react';

interface Question {
  question: string;
  answer_type: string;
  next_question?: string;
  options?: Record<string, {
    title: string;
    redirect_question?: string;
    redirect_blocks?: Block[];
    redirect_branch?: {
      branch: string;
      sheet: string;
      block_num: string;
      question_num: string;
    };
  }>;
  answer?: string;
  answer_option?: string;
  time_related?: boolean
}

interface Block {
  title: string;
  block_num: string;
  start_question?: string;
  finish_question?: string;
}

interface Response {
  question: string;
  answer_type: string;
  next_question?: string;
  options?: Record<string, {
    title: string;
    redirect_question?: string;
    redirect_blocks?: Block[];
    redirect_branch?: {
      branch: string;
      sheet: string;
      block_num: string;
      question_num: string;
    };
  }>;
  branch: string
  sheet: string
  block_num: string
  answer?: string;
  answer_option?: string;
  time_related?: boolean;
}



const QuestionVoice: React.FC = () => {
  //const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [response, setResponse] = useState('');
  const [responses, setResponses] = useState<Response[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const [currentBranch, setCurrentBranch] = useState('base_branch');
  const [currentSheet, setCurrentSheet] = useState('base_sheet');
  const [currentBlock, setCurrentBlock] = useState('base_block');
  const [currentQuestionNum, setCurrentQuestionNum] = useState('1');

  const [currentBlockData, setCurrentBlockData] = useState<Block | null>(null);

  const [isSpeakingEnabled, setIsSpeakingEnabled] = useState(true);
  const [interimText, setInterimText] = useState(''); // Новая переменная для промежуточных результатов


  const [hasStarted, setHasStarted] = useState(false);
  const [Ended, setEnded] = useState(false);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';

  const [isIshikawaGenerated, setIsIshikawaGenerated] = useState(false);
  const [isTimelineGenerated, setIsTimelineGenerated] = useState(false);

  const [IshikawaText, setIshikawaText] = useState('');
  const [TimelineText, setTimelineText] = useState('');

  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);

  const [ishikawaImageUrl, setIshikawaImageUrl] = useState<string | null>(null);
  const [timelineImageUrl, setTimelineImageUrl] = useState<string | null>(null);


  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  


  // Функция для проговаривания текста вопроса
  const speakQuestion = (text: string) => {
    // Останавливаем текущее проговаривание, если оно есть
    window.speechSynthesis.cancel();

    if (isSpeakingEnabled) {
      const speech = new SpeechSynthesisUtterance(text);
      speech.lang = 'ru-RU';
      window.speechSynthesis.speak(speech);
    }
  };

  const startRecognition = async () => {
    try {
      await requestMicrophoneAccess();
      const newRecognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
      newRecognition.lang = 'ru-RU';
      newRecognition.interimResults = true;
      newRecognition.continuous = true;
    
      newRecognition.onresult = (event: SpeechRecognitionEvent) => {
        let transcript = '';
  
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            setResponse((prevResponse) => {
              const updatedResponse = prevResponse.trim() + ' ' + transcript;
              setTimeout(() => {
                if (textAreaRef.current) {
                  textAreaRef.current.scrollTop = textAreaRef.current.scrollHeight; // Прокручиваем вниз
                }
              }, 0);
              return updatedResponse;
            });
            setInterimText(''); // Очищаем промежуточный текст
          } else {
            if (textAreaRef.current) {
              textAreaRef.current.scrollTop = textAreaRef.current.scrollHeight; // Прокручиваем вниз
            }
            setInterimText(transcript);
          }
        }
      };
  
      newRecognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Recognition error:', event.error);
      };
  
      newRecognition.onend = () => {
        setIsRecording(false);
        setRecognition(null);
        setInterimText('');
      };
  
      newRecognition.start();
      setRecognition(newRecognition);
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recognition:', error);
    }
  };
  

  const stopRecognition = () => {
    if (recognition) {
      recognition.stop();
      setIsRecording(false);
      setRecognition(null);
    }
  };

  const requestMicrophoneAccess = async () => {
    try {
      const permissionStatus = await navigator.permissions.query({ name: "microphone" as PermissionName });
      if (permissionStatus.state !== 'granted') {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      }
    } catch (error) {
      console.error('Ошибка при запросе доступа к микрофону:', error);
    }
  };

  const saveResponse = (resp: string, option?: string) => {


    if (currentQuestion) {
      const newResponse: Response = {
        ...currentQuestion,
        answer: currentQuestion.answer_type === 'text' ? resp : undefined,
        answer_option: currentQuestion.answer_type === 'test' || currentQuestion.answer_type === 'test-rec' ? option || undefined : undefined,
        // Сохраняем путь до блока в каждом ответе
        branch: currentBranch,
        sheet: currentSheet,
        block_num: currentBlock,
      };
  
      setResponses([...responses, newResponse]);
    }
  };
  

// Изменения в `handleNextQuestion`
const handleNextQuestion = async () => {
  if (response.trim() !== '' || selectedOption || currentQuestion?.answer_type === 'desc') {
    if (currentQuestion?.answer_type === 'test-rec' && !showOptions) {
      setIsLoading(true);
      try {
        const result = await axios.post<number>(`${backendUrl}/choose-option`, {
          options: currentQuestion.options,
          answer_text: response
        });
        console.log("Выбрано", result);
        setIsLoading(false);
        if (result.data !== 0) {
          saveResponse(response, result.data.toString());
          processNextStep(currentQuestion);
          setResponse(''); // Очистка текста ответа перед следующим вопросом
          setSelectedOption(null);
          setShowOptions(false);
        } else {
          setShowOptions(true);
          setResponse(''); // Очистка текста ответа перед следующим вопросом
        }
      } catch (error) {
        console.error('Ошибка при выборе опции:', error);
        setIsLoading(false);
      }
    } else {
      if (currentQuestion?.answer_type === "text") {
        saveResponse(response);
      } else {
        saveResponse(response, selectedOption || undefined);
      }

      if (currentQuestion != null) {
        processNextStep(currentQuestion);
      }
      setResponse(''); // Очистка текста ответа перед следующим вопросом
      setSelectedOption(null);
      setShowOptions(false);
    }
    stopRecognition(); // Остановка записи между вопросами
  }
};

const saveResponsesToBackend = async () => {
  try {
    // Приводим данные к ожидаемой Pydantic модели
    const formattedResponses = {
      questions: responses.map((resp) => {
        const responseObject: Record<string, any> = {
          question: resp.question,
          answer_type: resp.answer_type,
        };

        if (resp.next_question) {
          responseObject.next_question = resp.next_question;
        }

        if (resp.options && Object.keys(resp.options).length > 0) {
          responseObject.options = resp.options;
        }

        if (resp.answer) {
          responseObject.answer = resp.answer;
        }

        if (resp.answer_option) {
          responseObject.answer_option = resp.answer_option;
        }

        return responseObject;
      }),
      // Добавляем время начала и окончания опроса в запрос
      start_time: startTime ? startTime.toISOString() : null,
      end_time: endTime ? endTime.toISOString() : null,
    };

    // Отправляем ответы
    console.log(formattedResponses);
    await axios.post(`${backendUrl}/submit-answers`, formattedResponses);
    console.log('Ответы сохранены');
  } catch (error) {
    console.error('Ошибка при сохранении ответов:', error);
  }
};


const axiosInstance = axios.create({
  baseURL: backendUrl,
  timeout: 3600000,  // Таймаут 1 час (3600000 миллисекунд)
});

const generateIshikawaDiagram = async () => {
  try {
    const formattedResponse = await axiosInstance.post('/format-answers', { questions: responses });
    const formattedText = formattedResponse.data.formatted_text;

    console.log('creating ishikava');
    const isikava_text = await axiosInstance.post('/create-isikava', { formatted_text: formattedText });
    setIshikawaText(isikava_text.data.isikava);

    // Request the image visualization
    const ishikawaImageResponse = await axiosInstance.post('/generate-ishikawa-image', { formatted_text: isikava_text.data.isikava }, { responseType: 'blob' });
    const imageBlob = ishikawaImageResponse.data;
    const imageUrl = URL.createObjectURL(imageBlob);
    
    setIshikawaImageUrl(imageUrl);
    setIsIshikawaGenerated(true);  // Enable the download button

  } catch (error) {
    console.error('Ошибка при создании диаграммы Исикавы:', error);
  }
};



const generateTimeline = async () => {
  try {
    const filteredResponses = responses//.filter(response => response.time_related);
    const formattedResponse = await axiosInstance.post('/format-answers', { questions: filteredResponses });
    const formattedText = formattedResponse.data.formatted_text;

    console.log(formattedText)

    console.log('creating schedule');
    const timelineTextResponse = await axiosInstance.post('/create-schedule', { formatted_text: formattedText });
    setTimelineText(timelineTextResponse.data.timeline);

    console.log(timelineTextResponse.data.timeline)

    // Request the image visualization
    const timelineImageResponse = await axiosInstance.post('/generate-timeline-image', { formatted_text: timelineTextResponse.data.timeline }, { responseType: 'blob' });
    const imageBlob = timelineImageResponse.data;
    const imageUrl = URL.createObjectURL(imageBlob);

    setTimelineImageUrl(imageUrl);
    setIsTimelineGenerated(true);  // Enable the download button

  } catch (error) {
    console.error('Ошибка при создании временной шкалы:', error);
  }
};

  const formatTime = (date: Date | null): string => {
    if (!date) return "00:00"; // Возвращаем "00:00", если startTime равен null

    const hours = String(date.getHours()).padStart(2, '0'); // Получаем часы
    const minutes = String(date.getMinutes()).padStart(2, '0'); // Получаем минуты
    return `${hours}:${minutes}`; // Форматируем и возвращаем
  };

const downloadDescriprion = async () => {
  // 1. Установленный путь к шаблону
  const templatePath = 'Инциденты_заполнение.docx';

  // 2. Переменные startTime и endTime
  const start_time = formatTime(startTime); // пример значения, в вашем коде возьмите актуальное значение


  // Получаем текущее время
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0'); // Часы с ведущим нулем
  const minutes = String(now.getMinutes()).padStart(2, '0'); // Минуты с ведущим нулем

  // Присваиваем переменной endTime текущее время
  const end_time = `${hours}:${minutes}`;

  // 4. Получаем отформатированные ответы через API
  const formattedResponse = await axiosInstance.post(`${backendUrl}/format-answers`, { questions: responses });
  const formattedText = formattedResponse.data.formatted_text;

  console.log(responses);

  // 5. Создаем список из ответов с 3 по 13 (10 штук)
  const listAboutQuestions = responses.slice(3, 14).map(response => response.answer);

  // Подготавливаем данные для отправки на сервер
  const reportData = {
    template_path: templatePath,
    start_time: start_time,
    finish_time: end_time,
    questions_text: formattedText,
    list_about_questions: listAboutQuestions
  };

  // 6. Отправляем запрос на сервер для генерации и скачивания отчета
  const response = await axiosInstance.post(`${backendUrl}/fill_report`, reportData, {
    responseType: 'blob', // Указываем тип ответа как blob, чтобы получить файл
  });

  // 7. Создаем ссылку для скачивания файла
  const downloadUrl = window.URL.createObjectURL(new Blob([response.data]));
  const linkElement = document.createElement('a');
  linkElement.href = downloadUrl;
  linkElement.setAttribute('download', 'Отчет.docx'); // Название файла
  document.body.appendChild(linkElement);
  linkElement.click();

  // 8. Убираем ссылку из DOM после скачивания
  //linkElement.parentNode.removeChild(linkElement);
};



const downloadIshikawaDiagram = () => {
  // Download the text file
  const dataUri = 'data:text/plain;charset=utf-8,' + encodeURIComponent(IshikawaText);
  const exportFileDefaultName = 'ishikawa_diagram.txt';

  const textLink = document.createElement('a');
  textLink.setAttribute('href', dataUri);
  textLink.setAttribute('download', exportFileDefaultName);
  textLink.click();

  // Download the image file if available
  if (ishikawaImageUrl) {
    const imageLink = document.createElement('a');
    imageLink.href = ishikawaImageUrl;
    imageLink.download = 'ishikawa_diagram.png';
    imageLink.click();
  }
};

const downloadTimeline = () => {
  // Download the text file
  const dataUri = 'data:text/plain;charset=utf-8,' + encodeURIComponent(TimelineText);
  const exportFileDefaultName = 'timeline.txt';

  const textLink = document.createElement('a');
  textLink.setAttribute('href', dataUri);
  textLink.setAttribute('download', exportFileDefaultName);
  textLink.click();

  // Download the image file if available
  if (timelineImageUrl) {
    const imageLink = document.createElement('a');
    imageLink.href = timelineImageUrl;
    imageLink.download = 'timeline.png';
    imageLink.click();
  }
};



const downloadResponsesAsTxt = async () => {
  try {
    // Отправляем ответы на сервер для получения форматированного текста
    const response = await axios.post(`${backendUrl}/format-answers`, { questions: responses });
    const formattedText = response.data.formatted_text;

    // Создаем текстовый файл
    const dataUri = 'data:text/plain;charset=utf-8,' + encodeURIComponent(formattedText);
    const exportFileDefaultName = 'responses.txt';

    // Создаем и симулируем нажатие на ссылку для скачивания файла
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
  } catch (error) {
    console.error('Ошибка при загрузке текстового файла:', error);
  }
};


const processNextStep = (question: Question) => {
  const selectedOpt = question.options && selectedOption ? question.options[selectedOption] : null;

  if (question.next_question === 'finish_all') {
    saveResponsesToBackend();
    setCurrentQuestion(null);
    setEnded(true);
  } else if (question.next_question === 'finish_block' || (currentBlockData && currentBlockData.finish_question === currentQuestionNum)) {
    handleEndOfBlock();
    return
  } else if (selectedOpt?.redirect_question) {
    if (selectedOpt.redirect_question == "finish_block") {
      handleEndOfBlock();
      return
    }
    const redirectIndex = responses.findIndex(r => 
      r.next_question === selectedOpt.redirect_question &&
      r.branch === currentBranch &&        // Проверка на совпадение ветки
      r.sheet === currentSheet &&          // Проверка на совпадение листа
      r.block_num === currentBlock         // Проверка на совпадение блока
    );
    
    if (redirectIndex > -1) {
      setResponses(responses.slice(0, redirectIndex));
    }
    
    setCurrentQuestionNum(selectedOpt.redirect_question);
    fetchNextQuestion(currentBranch, currentSheet, currentBlock, selectedOpt.redirect_question);
  } else if (selectedOpt?.redirect_branch) {
    const { branch, sheet, block_num, question_num } = selectedOpt.redirect_branch;
    setCurrentBranch(branch);
    setCurrentSheet(sheet);
    setCurrentBlock(block_num);
    setCurrentBlockData(null); // Сбрасываем текущий блок
    setCurrentQuestionNum(question_num);
    fetchNextQuestion(branch, sheet, block_num, question_num);
  } else if (selectedOpt?.redirect_blocks) {
    setBlocks([...blocks, ...selectedOpt.redirect_blocks]);
    const nextBlock = selectedOpt.redirect_blocks[0];
    setCurrentSheet(nextBlock.title);
    setCurrentBlock(nextBlock.block_num);
    setCurrentBlockData(nextBlock); // Устанавливаем новый текущий блок
    setCurrentQuestionNum(nextBlock.start_question || '1');
    fetchNextQuestion(currentBranch, nextBlock.title, nextBlock.block_num, nextBlock.start_question || '1');
  } else if (question.next_question) {
    setCurrentQuestionNum(question.next_question);
    fetchNextQuestion(currentBranch, currentSheet, currentBlock, question.next_question);
  } else {
    handleEndOfBlock();
  }
};

const handleEndOfBlock = () => {
  const currentBlockIndex = blocks.findIndex(block => (block.block_num === currentBlock));

  if (currentBlockIndex !== -1 && currentBlockIndex < blocks.length - 1) {
    const nextBlock = blocks[currentBlockIndex + 1];
    setBlocks(blocks.filter((_, index) => index !== currentBlockIndex));
    setCurrentSheet(nextBlock.title);
    setCurrentBlock(nextBlock.block_num);
    setCurrentBlockData(nextBlock); // Обновляем текущий блок
    setCurrentQuestionNum(nextBlock.start_question || '1');
    fetchNextQuestion(currentBranch, nextBlock.title, nextBlock.block_num, nextBlock.start_question || '1');
  } else {
    setCurrentSheet('base_sheet');
    setCurrentBlock('base_block');
    setCurrentBlockData(null); // Сбрасываем текущий блок
    setCurrentQuestionNum('28');
    fetchNextQuestion(currentBranch, 'base_sheet', 'base_block', '28');
  }
};

  const fetchNextQuestion = async (branch: string, sheet: string, block: string, questionNum: string) => {
    const questionId = `${branch}-${sheet}-${block}-${questionNum}`;
    try {
      const response = await axios.get<Question>(`${backendUrl}/get-question/${questionId}`);
      const question = response.data;
      console.log(question)
      
      setCurrentQuestion(question);

      if (question) {
        speakQuestion(question.question);
      }
    } catch (error) {
      console.error('Ошибка при получении вопроса:', error);
    }
  };

// Функция для начала опроса
const initializeFirstQuestion = () => {
  setStartTime(new Date()); // Сохраняем текущее время как время начала опроса
  setCurrentBranch('base_branch');
  setCurrentSheet('base_sheet');
  setCurrentBlock('base_block');
  setCurrentQuestionNum('1');
  fetchNextQuestion('base_branch', 'base_sheet', 'base_block', '0'); // Затем делаем запрос для получения первого вопроса
};

  useEffect(() => {
    if (hasStarted) {
      initializeFirstQuestion();
    }
  }, [hasStarted]);
  

  useEffect(() => {
    if (Ended) {
      setEndTime(new Date()); // Сохраняем текущее время как время окончания опроса
      generateIshikawaDiagram();
      generateTimeline();
    }
  }, [Ended]);
  

  const capitalizeFirstLetter = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const textRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState<string>('clamp(1rem, 4vw, 2.5rem)');

  useEffect(() => {
    const adjustFontSize = () => {
      if (textRef.current) {
        const parentHeight = textRef.current.parentElement?.clientHeight || 0;
        const textHeight = textRef.current.clientHeight;

        if (textHeight > parentHeight) {
          setFontSize('clamp(0.8rem, 3vw, 2rem)');
        } else {
          
          setFontSize('clamp(1rem, 4vw, 2.5rem)');
          console.log(fontSize)
        }
      }
    };

    adjustFontSize();
    window.addEventListener('resize', adjustFontSize);

    return () => window.removeEventListener('resize', adjustFontSize);
  }, [currentQuestion?.question]);

  return (
    <div className="flex text-white p-10 w-full flex-col gap-8 text-3xl h-1/3 justify-center self-center mt-20">
      {!hasStarted ? (
        <button
          onClick={() => setHasStarted(true)}
          className="p-4 bg-gray-900 rounded-xl shadow-sm shadow-gray-800 w-full text-center"
        >
          Начать
        </button>
      ) : isLoading ? (
        <h1 className='justify-center text-center'>Загрузка...</h1>
      ) : Ended ? (
        <div className="flex flex-col items-center justify-center">
          <h1 className='justify-center text-center'>Спасибо, ответы записаны</h1>
          <button
            onClick={downloadResponsesAsTxt}
            className="p-4 bg-blue-500 rounded-xl shadow-sm shadow-blue-800 w-full text-center mt-4"
          >
            Скачать ответы в формате TXT
          </button>
          <button
            onClick={downloadIshikawaDiagram}
            className={`p-4 rounded-xl shadow-sm shadow-blue-800 w-full text-center mt-4 ${!isIshikawaGenerated ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500'}`}
            disabled={!isIshikawaGenerated} // Блокируем кнопку до завершения генерации
          >
            Диаграмма Исикавы
          </button>

          <button
            onClick={downloadTimeline}
            className={`p-4 rounded-xl shadow-sm shadow-blue-800 w-full text-center mt-4 ${!isTimelineGenerated ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500'}`}
            disabled={!isTimelineGenerated} // Блокируем кнопку до завершения генерации
          >
            Временная шкала
          </button>

          <button
            onClick={downloadDescriprion}
            className={`p-4 rounded-xl shadow-sm shadow-blue-800 w-full text-center mt-4 bg-blue-500`}
          >
            Отчет в docx
          </button>

        </div>
      ) : currentQuestion ? (
        <>
          <h1 className="flex justify-center text-center w-full">
            <div
              className="text-lg font-bold leading-tight max-h-25"  // Ограничение по высоте и скрытие переполнения
              style={{
                whiteSpace: "normal",
                wordWrap: "break-word",
                overflowWrap: "break-word",
                maxWidth: "100%",
                fontSize: 20, // Автоматическое уменьшение шрифта
                lineHeight: "1.2em", // Меньший межстрочный интервал для более компактного текста
              }}
            >
              {currentQuestion.question}
              {/*
              <TypeAnimation
                key={currentQuestion.question}
                sequence={[capitalizeFirstLetter(currentQuestion.question || ''), 1000]}
                wrapper="span"
                cursor
                repeat={0}
                speed={75}
            />*/}
            </div>
          </h1>
          <div className="flex flex-col gap-4">
            {currentQuestion.answer_type === 'text' || (currentQuestion.answer_type === 'test-rec' && !showOptions) ? (
              <textarea
                ref={textAreaRef}  // Привязываем реф к текстовому полю
                value={response + interimText}  // Показываем окончательный текст + промежуточный результат
                onChange={(e) => setResponse(e.target.value)}
                className="p-2 border border-gray-600 rounded-lg text-black placeholder-gray-400"
                placeholder="Введите ваш ответ"
                rows={4}
                style={{ color: 'black' }}
                disabled={showOptions}
              />

            ) : currentQuestion.answer_type === 'test' || showOptions ? (
              <div className="flex flex-col gap-2" style={{ fontSize: 25 }}>
                {currentQuestion.options && Object.keys(currentQuestion.options)
                  .filter(key => currentQuestion.options![key].title !== 'empty')  // Фильтрация опций с title === 'empty'
                  .map((key) => (
                    <label key={key} className="flex items-center">
                      <input
                        type="radio"
                        name="option"
                        value={capitalizeFirstLetter(key)}
                        checked={selectedOption === key}
                        onChange={() => setSelectedOption(key)}
                        className="mr-2"
                      />
                      <span className={`mr-2 font-bold ${selectedOption === key ? 'text-green-500' : ''}`}>
                        {key}.
                      </span>
                      {currentQuestion.options![key].title}
                    </label>
                  ))}
              </div>
            ) : null}
            {(currentQuestion.answer_type !== 'test' && !showOptions && !(currentQuestion.answer_type === "desc") ) && (
              <button
                onClick={isRecording ? stopRecognition : startRecognition}
                className={`p-2 rounded-full ${isRecording ? "bg-red-500" : 'bg-gray-700'}`}
              >
                {isRecording ? 'Остановить запись' : 'Начать запись'}
              </button>
            )}
          </div>
          <div className="flex gap-4 items-center mt-10">
            <button
              onClick={handleNextQuestion}
              disabled={response.trim() === '' && !selectedOption && !(currentQuestion.answer_type === "desc")}
              className={`flex justify-center ${response || selectedOption ? "bg-gray-900" : "bg-none border border-gray-600"} shadow-sm shadow-gray-800 p-2 rounded-xl w-full`}
            >
              Следующий вопрос
            </button>
            {/*<button onClick={toggleMic} className={`p-2 rounded-full ${isMicOn ? "bg-gray-700" : 'bg-red-500'}`}>
              {isMicOn ? <Mic className="text-white" /> : <MicOff className="text-white" />}
            </button>*/}
            <button 
            onClick={() => setIsSpeakingEnabled(!isSpeakingEnabled)} 
            className={`p-2 rounded-full ${isSpeakingEnabled ? "bg-green-500" : "bg-gray-700"}`}
            >
            {isSpeakingEnabled ? '🔊' : '🔇'}
          </button>
          </div>
        </>
      ) : (
        <h1 className='justify-center text-center'>Загрузка вопросов...</h1>
      )}
    </div>
  );
};  

export default QuestionVoice;
