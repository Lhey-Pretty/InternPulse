<?php

namespace App\Exceptions;

use App\Traits\ApiResponses;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Throwable;

/**
 * Turns every exception into the same JSON error format.
 */
class Handler extends ExceptionHandler
{
    // Gives the handler the error() helper from the ApiResponses trait
    use ApiResponses;

    // Fields never flashed to the session when validation fails
    protected $dontFlash = [
        'current_password',
        'password',
        'password_confirmation',
    ];

    // Which method builds the error list for which exception class
    protected array $apiHandlers = [
        ValidationException::class => 'handleValidation',
        ModelNotFoundException::class => 'handleModelNotFound',
        AuthenticationException::class => 'handleAuthentication',
        NotFoundHttpException::class => 'handleNotFoundHttp',
    ];

    // 422: one error object per invalid field message
    private function handleValidation(ValidationException $exception): array
    {
        $errors = [];

        foreach ($exception->errors() as $key => $messages) {
            foreach ($messages as $message) {
                $errors[] = [
                    'status'  => 422,
                    'message' => $message,
                    'source'  => $key,
                ];
            }
        }

        return $errors;
    }

    // 404: a model was not found in the database
    private function handleModelNotFound(ModelNotFoundException $exception): array
    {
        return [
            [
                'status'  => 404,
                'message' => 'The resource cannot be found.',
                'source'  => $exception->getModel(),
            ],
        ];
    }

    // 404: the URL does not exist (or route model binding failed)
    private function handleNotFoundHttp(NotFoundHttpException $exception): array
    {
        $source = 'Route';

        // When binding failed, the original exception tells us which model is missing
        if ($exception->getPrevious() instanceof ModelNotFoundException) {
            $source = $exception->getPrevious()->getModel();
        }

        return [
            [
                'status'  => 404,
                'message' => 'The resource cannot be found.',
                'source'  => $source,
            ],
        ];
    }

    // 401: missing, invalid or expired token
    private function handleAuthentication(AuthenticationException $exception): array
    {
        return [
            [
                'status'  => 401,
                'message' => 'Unauthenticated',
                'source'  => '',
            ],
        ];
    }

    /**
     * Laravel calls this for every exception. Known exceptions use their handler
     * method; anything else becomes a generic error.
     */
    public function render($request, Throwable $exception)
    {
        // Only format as JSON if the client requested an API route or expects JSON
        if (! $request->is('api/*') && ! $request->expectsJson()) {
            return parent::render($request, $exception);
        }

        $className = get_class($exception);

        // A known exception: build its error list with the matching method
        if (array_key_exists($className, $this->apiHandlers)) {
            $method = $this->apiHandlers[$className];

            return $this->error($this->$method($exception));
        }

        // Anything else: use the exception's own status (for example 405), or 500
        $status = $exception instanceof HttpExceptionInterface
            ? $exception->getStatusCode()
            : 500;

        // Only reveal the file and line while APP_DEBUG is true
        $source = config('app.debug')
            ? 'Line ' . $exception->getLine() . ': ' . $exception->getFile()
            : '';

        return $this->error([
            [
                'type'    => class_basename($className),
                'status'  => $status,
                'message' => config('app.debug') ? $exception->getMessage() : 'Server error',
                'source'  => $source,
            ],
        ]);
    }
}
