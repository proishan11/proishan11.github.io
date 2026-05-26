---
title: "Mathematics in Web Publishing"
subtitle: "Rendering beautiful equations on the web."
date: 2025-12-28
author: "Author"
math: true
draft: false
---

One of the challenges of technical writing on the web is properly rendering mathematical notation. With KaTeX, we can render both inline and display math beautifully.

## Inline Math

The quadratic formula $x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$ is one of the most well-known formulas in mathematics. We can also write Euler's number $e \approx 2.71828$ inline.

## Display Math

Euler's identity is often cited as the most beautiful equation:

$$e^{i\pi} + 1 = 0$$

The Gaussian integral:

$$\int_{-\infty}^{\infty} e^{-x^2}\, dx = \sqrt{\pi}$$

A matrix equation:

$$\begin{pmatrix} a & b \\ c & d \end{pmatrix} \begin{pmatrix} x \\ y \end{pmatrix} = \begin{pmatrix} ax + by \\ cx + dy \end{pmatrix}$$

## Code and Math Together

Here's a Python function that computes the Gaussian function:

```python
import math

def gaussian(x, mu=0, sigma=1):
    """Compute the Gaussian function."""
    coefficient = 1 / (sigma * math.sqrt(2 * math.pi))
    exponent = -0.5 * ((x - mu) / sigma) ** 2
    return coefficient * math.exp(exponent)

# The integral of this function over all reals equals 1
print(gaussian(0))  # Peak value at mean
```

The function above computes $f(x) = \frac{1}{\sigma\sqrt{2\pi}} e^{-\frac{1}{2}\left(\frac{x-\mu}{\sigma}\right)^2}$ which is the probability density function of the normal distribution.
